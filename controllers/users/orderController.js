import Owner from "../../model/OwnerModels.js";
import Offer from "../../model/OfferModel.js";
import Order from "../../model/orderModel.js";
import Product from "../../model/product.js";
import User from "../../model/usersModel.js";
import mongoose from "mongoose";
import {
  createOrderRazorePay,
  verifyPayment,
} from "../../middlewares/razorpay.js";
import {
  createShiprocketOrder,
  mapShiprocketStatus,
  trackShipment,
} from "../../middlewares/shiprocket.js";
import {
  createCashfreeOrder,
  verifyCashfreePayment,
} from "../../middlewares/Cashfree.js";
import dotenv from "dotenv";
import crypto from "crypto";
import PDFDocument from "pdfkit";
import {
  manageStock,
  validateStockAvailability,
  checkCODEligibility,
  calculateAdvanceCODAmount,
  formatOrderItems,
  calculateOrderDiscounts,
  getProductMapForItems,
  triggerOwnerNotificationHelper,
  sendOrderEmailHelper,
} from "../../helpers/orderHelpers.js";
import { validateRequiredFields } from "../../helpers/validationHelpers.js";

dotenv.config();
// ✅ CREATE PAYMENT ORDER
export const createPaymentOrder = async (req, res) => {
  try {
    const {
      address = {},
      amount,
      currency = "INR",
      paymentMethod = "RAZORPAY",
      subtotal,
      gstAmount,
      shippingAmount,
    } = req.body;

    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ message: "User not authenticated", success: false });
    }

    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    if (!user.cart || Array.isArray(user.cart)) {
      user.cart = { items: [], couponCode: null };
    }
    const { couponCode, items } = user.cart;

    // 🧾 1️⃣ Validate required fields
    const validation = validateRequiredFields({ userId, amount, items });
    if (!validation.isValid) {
      console.warn("⚠️ createPaymentOrder: Missing required fields", { userId: !!userId, amount, itemsLength: items.length });
      return res.status(400).json({
        message: validation.message,
        success: false,
      });
    }

    // Pre-fetch all products for stock and COD validation
    const productMap = await getProductMapForItems(items);

    // 🧾 1.5️⃣ Validate stock availability before creating payment order
    const stockCheck = validateStockAvailability(items, productMap);
    if (!stockCheck.success) {
      return res.status(stockCheck.statusCode || 400).json({
        success: false,
        message: stockCheck.message,
        productId: stockCheck.productId,
        productName: stockCheck.productName,
        available: stockCheck.available,
        requested: stockCheck.requested,
      });
    }

    // Use owner from tenant middleware or from user's ownerId
    const ownerId = user.ownerId || req.owner?._id;
    if (!ownerId) {
        console.warn("⚠️ createPaymentOrder: Store context not found", { userOwnerId: user.ownerId, reqOwnerId: req.owner?._id });
      return res.status(400).json({
        message: "Store context not found. Please access via a store domain.",
        success: false,
      });
    }

    const owner = await Owner.findById(ownerId)
      .select("+razorpayKeySecret +cashfreeSecretKey +cashfreeMode +settings.notificationSettings.emailPass +settings.notificationSettings.emailUser");

    let razorpayOrder = null;
    let cashfreeOrder = null;

    // 🔒 COD Validation
    if (paymentMethod.toUpperCase() === "COD" || paymentMethod.toUpperCase() === "CASH_ON_DELIVERY") {
      const codSettings = owner.settings?.codSettings || {
        enabled: true,
        minOrderValue: 0,
        maxOrderValue: 50000,
        allowAllPincodes: true,
        allowedPincodes: [],
        blockedPincodes: []
      };

      const codEligible = await checkCODEligibility({
        userId,
        items,
        shippingZip: address.zipCode || address.pincode,
        codSettings,
        productMap
      });

      if (!codEligible.allowed) {
        return res.status(400).json({
          message: codEligible.message,
          success: false
        });
      }

      const totalAmount = amount; // Using amount directly as passed

      if (totalAmount < (codSettings.minOrderValue || 0)) {
        return res.status(400).json({
          message: `Order amount is too low for COD. Minimum required: ₹${codSettings.minOrderValue}`,
          success: false
        });
      }

      if (codSettings.maxOrderValue && totalAmount > codSettings.maxOrderValue) {
        return res.status(400).json({
          message: `Order amount exceeds the limit for COD. Maximum allowed: ₹${codSettings.maxOrderValue}`,
          success: false
        });
      }
    }

    const orderNumber = `ORD-${Date.now()}`;
    let advanceAmount = 0;

    if (paymentMethod.toUpperCase() === "COD" || paymentMethod.toUpperCase() === "CASH_ON_DELIVERY") {
      advanceAmount = calculateAdvanceCODAmount(amount, owner.settings?.codSettings);
    }

    if (paymentMethod.toUpperCase() === "RAZORPAY" || (advanceAmount > 0 && owner?.razorpayKeyId && owner?.razorpayKeySecret)) {
      const keyId = owner?.razorpayKeyId || process.env.RAZORPAY_KEY_ID;
      const keySecret = owner?.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) {
        console.warn("⚠️ createPaymentOrder: Missing Razorpay credentials", {
           ownerId: owner?._id,
           hasOwnerKey: !!owner?.razorpayKeyId,
           hasEnvKey: !!process.env.RAZORPAY_KEY_ID
        });
        return res.status(400).json({
          message: "Razorpay credentials are not configured for this store.",
          success: false,
        });
      }
      
      const payableAmount = advanceAmount > 0 ? advanceAmount : amount;
      
      razorpayOrder = await createOrderRazorePay(
        keyId,
        keySecret,
        payableAmount,
        currency
      );
      if (!razorpayOrder?.id) {
        throw new Error("Failed to create Razorpay order");
      }
    } else if (paymentMethod.toUpperCase() === "CASHFREE" || (advanceAmount > 0 && owner?.cashfreeAppId && owner?.cashfreeSecretKey)) {
      if (!owner || !owner.cashfreeAppId || !owner.cashfreeSecretKey) {
        return res.status(400).json({
          message: "Cashfree credentials are not configured for this store. Please contact the store owner.",
          success: false,
        });
      }
      console.log(`🔍 Cashfree Debug: Mode=${owner.cashfreeMode || 'default(sandbox)'}, AppID=${owner.cashfreeAppId?.slice(0,6)}...`);
      
      const payableAmount = advanceAmount > 0 ? advanceAmount : amount;
      
      cashfreeOrder = await createCashfreeOrder(owner.cashfreeAppId, owner.cashfreeSecretKey, {
        orderId: orderNumber,
        amount: payableAmount,
        currency,
        customerId: userId.toString(),
        customerEmail: user.email,
        customerPhone: String(user.mobile || address.phone || "9999999999").replace(/\D/g, ''),
        customerName: user.username || (address.firstName ? `${address.firstName} ${address.lastName}`.trim() : "Customer"),
      }, owner.cashfreeMode || 'sandbox'); // Pass mode with fallback
      if (!cashfreeOrder?.payment_session_id) {
        throw new Error("Failed to create Cashfree order");
      }
    } else if (advanceAmount > 0) {
      return res.status(400).json({
        message: "Advance payment is required but no payment gateway is configured.",
        success: false,
      });
    }

    // 🧮 3️⃣ Format items
    const formattedItems = formatOrderItems(items, productMap);

    // 📦 4️⃣ Save order in MongoDB
    const order = new Order({
      couponCode: couponCode,
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      gstAmount: gstAmount || 0,
      shippingAmount: shippingAmount || 0,
      items: formattedItems,
      orderNumber,
      orderStatus: "PENDING",
      paymentMethod: paymentMethod.toUpperCase(),
      paymentStatus: "PENDING",
      razorpayOrderId: razorpayOrder?.id,
      cashfreeOrderId: cashfreeOrder?.order_id,
      shippingAddress: {
        address: address?.address || "",
        city: address?.city || "",
        firstName: address?.firstName || "",
        lastName: address?.lastName || "",
        phone: address?.phone || "",
        state: address?.state || "",
        zipCode: address?.zipCode || "",
      },
      subtotal: subtotal || amount,
      totalAmount: amount,
      userId,
    });

    await order.save();
    
    // 📢 Trigger notification for store owner
    if (order.paymentMethod === "COD" || order.paymentMethod === "CASH_ON_DELIVERY") {
      triggerOwnerNotificationHelper({
        ownerId,
        type: "NEW_ORDER",
        order,
        amount,
      });
    }

    // 📧 Send confirmation email
    if (user && user.email) {
      sendOrderEmailHelper(order._id, user.email, owner);
    }

    // 🎉 6️⃣ Success response
    let finalKey = owner.cashfreeAppId;
    if (paymentMethod.toUpperCase() === "RAZORPAY" || razorpayOrder) {
      finalKey = owner.razorpayKeyId;
    }

    return res.status(201).json({
      data: {
        key: finalKey,
        orderId: order._id,
        razorpayOrder,
        cashfreeOrder,
      },
      message: `${paymentMethod} order created successfully`,
      success: true,
    });
  } catch (error) {
    console.error("❌ Payment Order Error:", error.message);

    // Handle known Cashfree/Razorpay errors gracefully
    if (
      error.message.includes('authentication_error') || 
      error.message.includes('validation_error') ||
      error.message.includes('invalid_request_error')
    ) {
      return res.status(400).json({
        message: `Payment Configuration Error: ${error.message}`,
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      error: error.message,
      message: "Failed to create payment order",
      success: false,
    });
  }
};

export const generateInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId || req.params.id;
    const userId = req.user.id;

    // Fetch order details, ensuring it belongs to the user
    const order = await Order.findOne({ _id: orderId, userId })
      .populate("userId", "username email")
      .populate("items.productId", "name")
      .lean();

    if (!order) {
      return res.status(404).json({
        message: "Order not found or you are not authorized to view it.",
        success: false,
      });
    }

    const doc = new PDFDocument({ margin: 50, size: "A4" });

    // Set response headers to trigger PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${order.orderNumber}.pdf`
    );

    // Pipe the PDF document to the response
    doc.pipe(res);

    // --- Add content to the PDF ---

    // Header
    doc.fontSize(20).text("Invoice", { align: "center" }).moveDown();

    // Order details
    doc.fontSize(12).text(`Order Number: ${order.orderNumber}`);
    doc.text(`Order Date: ${order.createdAt.toLocaleDateString()}`);
    doc.text(`Customer: ${order.userId.username} (${order.userId.email})`);
    doc.moveDown();

    // Shipping Address
    doc.fontSize(14).text("Shipping Address", { underline: true });
    const { address, city, firstName, lastName, phone, state, zipCode } =
      order.shippingAddress;
    doc.fontSize(12).text(`${firstName} ${lastName}`);
    doc.text(address);
    doc.text(`${city}, ${state} ${zipCode}`);
    doc.text(`Phone: ${phone}`);
    doc.moveDown();

    // Items Table Header
    const tableTop = doc.y;
    doc.fontSize(12);
    doc.text("Product", 50, tableTop);
    doc.text("Quantity", 250, tableTop, { align: "right", width: 90 });
    doc.text("Price", 350, tableTop, { align: "right", width: 90 });
    doc.text("Total", 0, tableTop, { align: "right" });
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Items Table Rows
    order.items.forEach((item) => {
      const y = doc.y;
      doc.text(item.product_name, 50, y);
      doc.text(item.quantity.toString(), 250, y, { align: "right", width: 90 });
      doc.text(`₹${item.price.toFixed(2)}`, 350, y, {
        align: "right",
        width: 90,
      });
      doc.text(`₹${(item.price * item.quantity).toFixed(2)}`, 0, y, {
        align: "right",
      });
      doc.moveDown();
    });
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Totals
    doc
      .fontSize(14)
      .text(`Subtotal: ₹${order.subtotal.toFixed(2)}`, { align: "right" });
    doc.text(`GST: ₹${(order.gstAmount || 0).toFixed(2)}`, { align: "right" });
    doc.text(`Shipping: ₹${(order.shippingAmount || 0).toFixed(2)}`, { align: "right" });
    doc
      .font("Helvetica-Bold")
      .text(`Total Amount: ₹${order.totalAmount.toFixed(2)}`, {
        align: "right",
      });
    doc.moveDown(2);

    // Footer
    doc.fontSize(10).text("Thank you for your business!", { align: "center" });

    // Finalize the PDF and end the stream
    doc.end();
  } catch (error) {
    console.error("❌ Error generating invoice:", error);
    res.status(500).json({
      error: error.message,
      message: "Failed to generate invoice",
      success: false,
    });
  }
};

export const archiveOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId || req.params.id;
    const userId = req.user.id;

    // Find the order and update it
    const order = await Order.findOneAndUpdate(
      { _id: orderId, userId },
      { isArchived: true },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found or you are not authorized.",
        success: false,
      });
    }

    res.status(200).json({
      data: order,
      message: "Order archived successfully.",
      success: true,
    });
  } catch (error) {
    console.error("❌ Archive order error:", error);
    res.status(500).json({ error: error.message, message: "Failed to archive order.", success: false });
  }
};

export const returnOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId || req.params.id;
    const { reason } = req.body;
    const userId = req.user.id;

    const order = await Order.findOne({ _id: orderId, userId }).populate("userId", "ownerId");
    if (!order) {
      return res.status(404).json({ message: "Order not found", success: false });
    }

    if (order.orderStatus !== "DELIVERED") {
      return res.status(400).json({ message: "Order must be delivered to be returned", success: false });
    }

    // Check return window (e.g., 7 days)
    const deliveryDate = new Date(order.deliveredAt || order.updatedAt); 
    const now = new Date();
    const diffTime = Math.abs(now - deliveryDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 7) {
       return res.status(400).json({ message: "Return window has closed", success: false });
    }

    order.orderStatus = "RETURN_REQUESTED";
    order.returnReason = reason;
    await order.save();
    
    // 📢 Trigger notification for store owner
    if (order.userId && order.userId.ownerId) {
      triggerOwnerNotificationHelper({
        ownerId: order.userId.ownerId,
        type: "RETURN_REQUESTED",
        order,
        reason,
      });
    }

    res.status(200).json({ data: order, message: "Return requested successfully", success: true });
  } catch (error) {
    console.error("Return order error:", error);
    res.status(500).json({ message: "Failed to request return", success: false });
  }
};

export const generateGiftReceipt = async (req, res) => {
  try {
    const orderId = req.params.orderId || req.params.id;
    const userId = req.user.id;

    const order = await Order.findOne({ _id: orderId, userId })
      .populate("items.productId", "name")
      .lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found", success: false });
    }

    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=gift-receipt-${order.orderNumber}.pdf`);

    doc.pipe(res);

    doc.fontSize(20).text("Gift Receipt", { align: "center" }).moveDown();
    doc.fontSize(12).text(`Order Number: ${order.orderNumber}`);
    doc.text(`Order Date: ${order.createdAt.toLocaleDateString()}`);
    doc.moveDown();

    doc.fontSize(14).text("Items", { underline: true });
    doc.moveDown();

    order.items.forEach((item) => {
      doc.fontSize(12).text(`${item.product_name} x ${item.quantity}`);
      doc.moveDown(0.5);
    });

    doc.moveDown(2);
    doc.fontSize(10).text("This receipt does not include prices.", { align: "center" });
    doc.end();
  } catch (error) {
    console.error("Error generating gift receipt:", error);
    res.status(500).json({ message: "Failed to generate gift receipt", success: false });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId || req.params.id;
    const { reason } = req.body;
    const userId = req.user.id;

    // Validate orderId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        message: "Invalid order ID format",
        success: false,
      });
    }

    // Find the order and ensure it belongs to the user
    const order = await Order.findOne({ _id: orderId, userId }).populate("userId", "ownerId");
    if (!order) {
      return res.status(404).json({
        message: "Order not found or unauthorized",
        success: false,
      });
    }

    // Prevent canceling if already delivered or cancelled
    if (["DELIVERED", "CANCELLED"].includes(order.orderStatus)) {
      return res.status(400).json({
        message: `Order cannot be cancelled as it is already ${order.orderStatus.toLowerCase()}`,
        success: false,
      });
    }

    // Check if order was already confirmed (to restore stock)
    const wasConfirmed = ["CONFIRMED", "PROCESSING", "SHIPPED"].includes(
      order.orderStatus
    );

    // Update order status
    order.orderStatus = "CANCELLED";
    order.cancellationReason = reason || "Cancelled by user";

    // Restore stock if order was confirmed
    if (wasConfirmed && order.items && order.items.length > 0) {
      await manageStock(order.items, "restore");
    }

    await order.save();

    // 📢 Trigger notification for store owner
    if (order.userId && order.userId.ownerId) {
      triggerOwnerNotificationHelper({
        ownerId: order.userId.ownerId,
        type: "ORDER_CANCELLED",
        order,
        reason,
      });
    }

    return res.status(200).json({
      data: order,
      message: "Order cancelled successfully",
      success: true,
    });
  } catch (error) {
    console.error("❌ Cancel order error:", error);
    res.status(500).json({
      error: error.message,
      message: "Failed to cancel order",
      success: false,
    });
  }
};

export const verifyAndProcessPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, cashfree_order_id } =
      req.body;

    const ownerId = req.ownerId || req.user?.ownerId;
    const owner = await Owner.findById(ownerId)
      .select("+razorpayKeySecret +cashfreeSecretKey +settings.notificationSettings.emailPass +settings.notificationSettings.emailUser")
      .lean();

    let order = null;
    let payment_verified = false;

    if (cashfree_order_id) {
      if (!owner || !owner.cashfreeAppId || !owner.cashfreeSecretKey) {
        throw new Error("Cashfree credentials not configured");
      }

      const cfOrder = await verifyCashfreePayment(
        cashfree_order_id,
        owner.cashfreeAppId,
        owner.cashfreeSecretKey,
        owner.cashfreeMode // Pass mode
      );

      if (cfOrder.order_status === "PAID") {
        payment_verified = true;
        order = await Order.findOne({ cashfreeOrderId: cashfree_order_id });
      } else {
        return res.status(400).json({
          message: `Payment status: ${cfOrder.order_status}`,
          success: false,
        });
      }
    } else if (razorpay_order_id) {
      const secret = owner?.razorpayKeySecret;
      if (!secret) {
        console.error(
          "❌ RAZORPAY_KEY_SECRET is missing!"
        );
        throw new Error("Razorpay secret key not configured");
      }

      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature === razorpay_signature) {
        payment_verified = true;
        order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
      } else {
        return res.status(400).json({
          message: "Payment signature verification failed",
          success: false,
        });
      }
    }

    if (!payment_verified || !order) {
      return res
        .status(404)
        .json({ message: "Order not found or payment not verified", success: false });
    }

    // 2.5️⃣ Prevent double-processing
    if (order.paymentStatus === "PAID" && order.orderStatus === "CONFIRMED") {
      return res.status(200).json({
        success: true,
        message: "Payment already verified and order confirmed",
        order,
      });
    }

    // ✅ 3️⃣ Check and deduct stock before confirming order
    const stockResult = await manageStock(order.items, "deduct");
    if (!stockResult.success || stockResult.failed.length > 0) {
      // Rollback: Payment is verified but stock is insufficient
      console.error("❌ Stock management failed:", stockResult.failed);

      // Update order with failure reason
      order.paymentStatus = "FAILED";
      order.failureReason = `Stock unavailable for: ${stockResult.failed
        .map((f) => f.productName || f.productId)
        .join(", ")}`;
      await order.save();

      return res.status(400).json({
        success: false,
        message: "Order cannot be processed due to insufficient stock",
        details: stockResult.failed,
        order,
      });
    }

    // ✅ 4️⃣ Update order status after successful stock deduction
    order.paymentStatus = "PAID";
    order.orderStatus = "CONFIRMED";
    if (razorpay_payment_id) order.razorpayPaymentId = razorpay_payment_id;
    if (razorpay_signature) order.razorpaySignature = razorpay_signature;
    await order.save();

    // 📢 Trigger notification for store owner
    triggerOwnerNotificationHelper({
      ownerId: order.ownerId || ownerId,
      type: "NEW_ORDER",
      order,
    });

    // 📧 Send confirmation email
    sendOrderEmailHelper(order._id, null, owner);

    res.status(200).json({
      success: true,
      message: "Payment verified and order confirmed",
      order,
      stockUpdated: stockResult.updated,
    });
  } catch (error) {
    console.error("❌ Payment verification failed:", error);
    res.status(500).json({
      error: error.message,
      message: "Payment verification failed",
      success: false,
    });
  }
};

export const getUserOrders = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ message: "User not authenticated", success: false });
    }

    const userId = req.user.id;
    const {
      status,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 4, // Default page size
      archived,
    } = req.query;

    const query = { userId: new mongoose.Types.ObjectId(userId) };

    if (archived === 'true') {
      query.isArchived = true;
    } else {
      query.isArchived = { $ne: true };
    }

    if (status && status !== "ALL") {
      query.orderStatus = status;
    }

    if (startDate && startDate !== "null") {
      query.createdAt = { ...query.createdAt, $gte: new Date(startDate) };
    }

    if (endDate && endDate !== "null") {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      query.createdAt = { ...query.createdAt, $lte: endOfDay };
    }

    if (search) {
      const searchRegex = { $options: "i", $regex: search };
      query.$or = [
        { orderNumber: searchRegex },
        { "items.product_name": searchRegex },
        { "shippingAddress.firstName": searchRegex },
        { "shippingAddress.lastName": searchRegex },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Fetch total count and orders concurrently
    const [totalItems, orders] = await Promise.all([
      Order.countDocuments(query),
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate({
          path: "items.productId",
          select: "name price images stock inStock",
        })
        .lean()
    ]);
    const totalPages = Math.ceil(totalItems / limitNum);
    res.status(200).json({
      data: orders,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems,
      },
      success: true,
    });
  } catch (error) {
    console.error("❌ Error fetching user orders:", error);
    res.status(500).json({
      error: error.message,
      message: "Failed to fetch user orders",
      success: false,
    });
  }
};

export const getOrderDetailsWithTracking = async (req, res) => {
  try {
    const orderId = req.params.id || req.params.orderId;
    const userId = req.user.id;

    const order = await Order.findOne({ _id: orderId, userId })
      .populate({
        path: "items.productId",
        select: "name price images stock inStock",
      })
      .lean();

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
        success: false,
      });
    }

    let trackingData = null;

    // If order has a Shiprocket order ID, get tracking info
    if (order.shiprocketOrderId) {
      try {
        const shiprocketTracking = await trackShipment(order.shiprocketOrderId);

        trackingData = {
          awbCode: shiprocketTracking.data?.awb_code || order.shiprocketAWB,
          courier: shiprocketTracking.data?.courier_name || "Not Available",
          expectedDelivery:
            shiprocketTracking.data?.expected_delivery_date || null,
          latestUpdate:
            shiprocketTracking.data?.tracking_data?.shipment_track?.[0] || null,
          shipmentId: order.shiprocketOrderId,
          status: shiprocketTracking.data?.status || "Pending",
          trackingHistory:
            shiprocketTracking.data?.tracking_data?.shipment_track || [],
        };
      } catch (trackingError) {
        console.error("⚠️ Error fetching tracking data:", trackingError);
      }
    }

    res.status(200).json({
      data: {
        order,
        tracking: trackingData,
      },
      success: true,
    });
  } catch (error) {
    console.error("❌ Error fetching order details with tracking:", error);
    res.status(500).json({
      message: error.message || "Failed to fetch order details with tracking",
      success: false,
    });
  }
};

export const createOrder = async (req, res) => {
  try {
    // 1. Destructure and validate input
    const {
      items = [],
      paymentMethod = "",
      shippingAddress = {},
      totalAmount = 0,
      userId, // This might be passed from an admin context
    } = req.body;

    const currentUserId = req.user?.id || userId;

    const validation = validateRequiredFields({ userId: currentUserId, items });
    if (!validation.isValid) {
      return res.status(400).json({
        message: validation.message,
        success: false,
      });
    }

    // --- Secure Offer Application Logic ---
    const {
      processedItems,
      calculatedSubtotal,
      totalDiscount,
      appliedOffers
    } = await calculateOrderDiscounts(items);

    // 2. Check and deduct stock
    const stockResult = await manageStock(processedItems, "deduct");
    if (!stockResult.success || stockResult.failed.length > 0) {
      console.error("❌ Stock management failed:", stockResult.failed);
      return res.status(400).json({
        details: stockResult.failed,
        message: "Order cannot be created due to insufficient stock",
        success: false,
      });
    }
    console.log("✅ Stock deducted:", stockResult.updated);

    // 3. Create and save the order
    const orderNumber = `ORD-${Date.now()}`;
    const newOrder = new Order({
      items: processedItems,
      orderDate: new Date(),
      orderNumber,
      orderStatus: "CONFIRMED", // Should be confirmed if stock is deducted
      paymentMethod,
      shippingAddress,
      subtotal: calculatedSubtotal,
      totalAmount: (calculatedSubtotal - totalDiscount) + (req.body.shippingAmount || 0) + (req.body.gstAmount || 0), // Include shipping and tax 
      shippingAmount: req.body.shippingAmount || 0,
      gstAmount: req.body.gstAmount || 0,
      couponCode: appliedOffers.map(o => o.offerCode).join(', ') || null, // Store applied codes
      userId: currentUserId,
    });

    const savedOrder = await newOrder.save();

    sendOrderEmailHelper(savedOrder._id);

    // 4. Create Shiprocket order (MOVED TO MANUAL IN ADMIN)
    /*
    let shiprocketResult = null;
    try {
      const srResp = await createShiprocketOrder(savedOrder);
      if (srResp && srResp.success) {
        const resp = srResp.data || {};
        if (resp.expected_delivery_date) {
          savedOrder.shiprocketExpectedDelivery = new Date(
            resp.expected_delivery_date
          );
        }
        savedOrder.shiprocketLastUpdate = new Date();
        if (
          resp.shipment_id &&
          (!savedOrder.shiprocketAWB || savedOrder.shiprocketAWB === "")
        ) {
          try {
            const t = await trackShipment(resp.shipment_id);
            if (t && t.success && t.data) {
              if (t.data.awb_code) savedOrder.shiprocketAWB = t.data.awb_code;
              if (t.data.status)
                savedOrder.shiprocketStatus = mapShiprocketStatus(
                  t.data.status
                );
              savedOrder.shiprocketLastUpdate = new Date();
            }
          } catch (e) {
            console.error(
              "❌ Immediate tracking after create failed:",
              e?.message || e
            );
          }
        }
        await savedOrder.save();
        savedOrder.shiprocketOrderId =
          resp.shipment_id || resp.order_id || resp.id || null;
        savedOrder.shiprocketAWB = resp.awb_code || resp.awb || null;
        savedOrder.shiprocketRawStatus = resp.status || null;
        savedOrder.shiprocketCourier = resp.courier_name || null;
        savedOrder.shiprocketStatusCode = resp.status_code || null;
        savedOrder.shiprocketRawResponse = resp || null;

        savedOrder.shiprocketStatus = resp.shipment_id
          ? "created"
          : mapShiprocketStatus(resp.status);
        shiprocketResult = resp;
      } else {
        console.warn(
          "⚠️ Shiprocket create returned no success:",
          srResp?.message || srResp
        );
      }
    } catch (err) {
      console.error("❌ Error while creating Shiprocket order:", err);
    }
    */

    // 5. Respond to client
    res.status(201).json({
      data: {
        order: savedOrder,
        shiprocket: shiprocketResult,
        stockUpdated: stockResult.updated,
      },
      message: "Order created successfully",
      success: true,
    });
  } catch (error) {
    console.error("❌ Error creating order:", error);
    res.status(500).json({
      message: "Failed to create order",
      success: false,
    });
  }
};

// Create Cash-on-Delivery (COD) order
export const createCODOrder = async (req, res) => {
  try {
    const {
      shippingAddress = {},
      totalAmount = 0,
      amount,
      address, // sometimes clients send `address` instead of `shippingAddress`
      items: requestItems, // Items from request body (for Buy Now flow)
      couponCode: requestCouponCode, // Coupon from request
    } = req.body;

    // prefer authenticated user id when available
    const userId = req.user?.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    if (!user.cart || Array.isArray(user.cart)) {
      user.cart = { items: [], couponCode: null };
    }

    // Use items from request body if provided (Buy Now flow), otherwise use cart items
    let items = [];
    let couponCode = null;
    
    if (requestItems && Array.isArray(requestItems) && requestItems.length > 0) {
      // Buy Now flow - items come from request
      items = requestItems;
      couponCode = requestCouponCode || null;
      console.log("📦 Using items from request body (Buy Now flow)");
    } else {
      // Regular cart checkout flow - items from user's cart
      items = user.cart?.items || [];
      couponCode = user.cart?.couponCode || null;
      console.log("🛒 Using items from user cart");
    }

    const validation = validateRequiredFields({ userId, items });
    if (!validation.isValid) {
      return res
        .status(400)
        .json({
          message: validation.message + ". Please add items to your cart.",
          success: false,
        });
    }

    // Normalize shipping address: accept `shippingAddress` or `address`
    const addrSource =
      shippingAddress && Object.keys(shippingAddress).length
        ? shippingAddress
        : address || {};
    const shipping = {
      address:
        addrSource.address || addrSource.address1 || addrSource.street || "",
      city: addrSource.city || "",
      firstName: addrSource.firstName || addrSource.first_name || "",
      lastName: addrSource.lastName || addrSource.last_name || "",
      phone:
        addrSource.phone || addrSource.mobile || addrSource.phoneNumber || "",
      state: addrSource.state || "",
      zipCode:
        addrSource.zipCode ||
        addrSource.pincode ||
        addrSource.zip ||
        addrSource.postal ||
        "",
    };

    // Pre-fetch all products for product-specific COD rules check
    const productMap = await getProductMapForItems(items);

    // Check COD availability
    const owner = await Owner.findOne().select('+settings.notificationSettings.emailPass +settings.notificationSettings.emailUser');
    const codSettings = owner?.settings?.codSettings || { enabled: true };
    const codEligible = await checkCODEligibility({
      userId,
      items,
      shippingZip: shipping.zipCode,
      codSettings,
      productMap
    });

    if (!codEligible.allowed) {
      return res.status(400).json({
        message: codEligible.message,
        success: false,
      });
    }

    // Normalize items (ensure consistent shape)
    const formattedItems = formatOrderItems(items, productMap);

    // Determine total amount: prefer explicit `amount` or `totalAmount`, otherwise compute from items
    const computedTotal = formattedItems.reduce(
      (s, it) => s + Number(it.price || 0) * Number(it.quantity || 0),
      0
    );
    const finalTotal = Number(amount ?? totalAmount ?? computedTotal);

    const orderNumber = `ORD-${Date.now()}`;
    const newOrder = new Order({
      orderNumber,
      userId,
      items: formattedItems,
      shippingAddress: shipping,
      paymentMethod: "COD",
      totalAmount: finalTotal,
      subtotal: computedTotal,
      shippingAmount: req.body.shippingAmount || 0,
      gstAmount: req.body.gstAmount || 0,
      paymentStatus: "PENDING",
      orderStatus: "PENDING", // for COD we mark confirmed
      couponCode: couponCode,
      orderDate: new Date(),
    });

    // ✅ Check and deduct stock before saving order
    const stockResult = await manageStock(formattedItems, "deduct");
    if (!stockResult.success || stockResult.failed.length > 0) {
      console.error(
        "❌ Stock management failed for COD order:",
        stockResult.failed
      );
      return res.status(400).json({
        details: stockResult.failed,
        message: "Order cannot be created due to insufficient stock",
        success: false,
      });
    }

    const savedOrder = await newOrder.save();

    // Update order status to confirmed for COD
    savedOrder.orderStatus = "CONFIRMED";
    savedOrder.paymentStatus = "PENDING"; // COD payment is pending
    await savedOrder.save();

    console.log("✅ COD Order created and stock updated:", stockResult.updated);

    // 📧 Send confirmation email
    if (user && user.email) {
      sendOrderEmailHelper(savedOrder._id, user.email, owner);
    }

    // Optional: create Shiprocket order immediately (MOVED TO MANUAL IN ADMIN)
    /*
    try {
      const sr = await createShiprocketOrder(savedOrder);
      if (sr && sr.success) {
        await savedOrder.save();
        const resp = sr.data || {};
        savedOrder.shiprocketOrderId =
          resp.shipment_id || resp.order_id || resp.id || null;
        savedOrder.shiprocketAWB = resp.awb_code || resp.awb || null;
        savedOrder.shiprocketCourier = resp.courier_name || null;
        savedOrder.shiprocketRawStatus = resp.status || null;
        savedOrder.shiprocketStatusCode = resp.status_code || null;
        savedOrder.shiprocketRawResponse = resp || null;
        savedOrder.shiprocketStatus = resp.shipment_id
          ? "created"
          : mapShiprocketStatus(resp.status);
        savedOrder.shiprocketLastUpdate = new Date();
      }
    } catch (err) {
      console.warn("⚠️ Shiprocket create (COD) failed:", err.message || err);
    }
    */

    // Clear user's cart
    user.cart = { items: [], couponCode: null };
    await user.save();

    return res.status(201).json({
      success: true,
      message: "COD order created",
      data: savedOrder,
      stockUpdated: stockResult.updated,
    });
  } catch (error) {
    console.error("❌ Error creating COD order:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: error.message || "Internal server error",
      });
  }
};

export const getOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id || req.params.orderId;
    const userId = req.user.id;

    const order = await Order.findOne({ _id: orderId, userId })
      .populate({
        path: "items.productId",
        select: "name price images stock inStock",
      })
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("❌ Error getting order details:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get order details",
    });
  }
};
