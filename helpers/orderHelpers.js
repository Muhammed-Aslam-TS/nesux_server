import Product from "../model/product.js";
import Offer from "../model/OfferModel.js";
import Order from "../model/orderModel.js";
import Owner from "../model/OwnerModels.js";
import { sendOrderConfirmationEmail } from "../services/emailService.js";
import { createOwnerNotification } from "../services/notificationService.js";

/**
 * Manage product inventory stocks (deduct or restore).
 * @param {Array} items - Order line items.
 * @param {string} operation - "deduct" or "restore".
 * @returns {Object} Result of stock updates.
 */
export const manageStock = async (items, operation = "deduct") => {
  const results = {
    errors: [],
    failed: [],
    success: true,
    updated: [],
  };

  try {
    // Pre-fetch all products to avoid N+1 queries
    const productIds = items
      .map((item) => item.productId?._id || item.productId || item._id)
      .filter((id) => id);

    const productsArray = await Product.find({ _id: { $in: productIds } });
    const productMap = productsArray.reduce((acc, product) => {
      acc[product._id.toString()] = product;
      return acc;
    }, {});

    for (const item of items) {
      const productId = item.productId?._id || item.productId || item._id;
      const quantity = Number(item.quantity || 0);
      const variantId = item.variantId;

      if (!productId || quantity <= 0) {
        continue;
      }

      try {
        const product = productMap[productId.toString()];
        if (!product) {
          results.failed.push({
            productId,
            reason: "Product not found",
          });
          continue;
        }

        const productName = product.title || product.name;
        let currentStock = 0;
        let variant = null;

        if (product.productType === 'variable') {
          // If no variant specified, auto-select first available variant with stock
          if (!variantId) {
            // Find first variant with stock > 0
            const availableVariant = product.variants.find(v => v.stockQuantity > 0);
            if (availableVariant) {
              variant = availableVariant;
              console.log(`⚡ Auto-selected variant ${variant._id} for product ${productName}`);
            } else {
              // No variant with stock available
              results.failed.push({
                productId,
                productName,
                reason: "No variants available in stock",
              });
              results.success = false;
              continue;
            }
          } else {
            variant = product.variants.id(variantId);
            if (!variant) {
              results.failed.push({
                productId,
                productName,
                reason: "Variant not found",
              });
              results.success = false;
              continue;
            }
          }
          currentStock = variant.stockQuantity;
        } else {
          currentStock = product.baseStock !== undefined ? product.baseStock : (product.stock || 0);
        }

        if (operation === "deduct") {
          // Check if sufficient stock available
          if (currentStock < quantity) {
            results.failed.push({
              available: currentStock,
              productId,
              productName: productName,
              reason: "Insufficient stock",
              requested: quantity,
            });
            results.success = false;
            continue;
          }

          // Deduct stock
          if (variant) {
            variant.stockQuantity = Math.max(0, variant.stockQuantity - quantity);
            variant.inStock = variant.stockQuantity > 0;
          } else if (product.baseStock !== undefined) {
            product.baseStock = Math.max(0, product.baseStock - quantity);
          } else {
            product.stock = Math.max(0, product.stock - quantity);
            product.inStock = product.stock > 0;
          }

          if (!product.sku) {
            product.sku = product._id.toString();
          }
          if (product.specifications && Array.isArray(product.specifications)) {
            product.specifications = product.specifications.filter(
              (spec) => spec.key && spec.value
            );
          }
          await product.save({ validateBeforeSave: false });

          results.updated.push({
            inStock: product.inStock,
            productId,
            productName: productName,
            quantity,
            remainingStock: variant ? variant.stockQuantity : (product.baseStock !== undefined ? product.baseStock : product.stock),
          });
        } else if (operation === "restore") {
          // Restore stock
          if (variant) {
            variant.stockQuantity = (variant.stockQuantity || 0) + quantity;
            variant.inStock = variant.stockQuantity > 0;
          } else if (product.baseStock !== undefined) {
            product.baseStock = (product.baseStock || 0) + quantity;
          } else {
            product.stock = (product.stock || 0) + quantity;
            product.inStock = product.stock > 0;
          }

          if (!product.sku) {
            product.sku = product._id.toString();
          }
          if (product.specifications && Array.isArray(product.specifications)) {
            product.specifications = product.specifications.filter(
              (spec) => spec.key && spec.value
            );
          }
          await product.save({ validateBeforeSave: false });

          results.updated.push({
            inStock: product.inStock,
            productId,
            productName: productName,
            quantity,
            restoredStock: variant ? variant.stockQuantity : (product.baseStock !== undefined ? product.baseStock : product.stock),
          });
        }
      } catch (error) {
        console.error(
          `❌ Error managing stock for product ${productId}:`,
          error
        );
        results.failed.push({
          productId,
          reason: error.message || "Unknown error",
        });
        results.errors.push({
          error: error.message,
          productId,
        });
      }
    }

    return results;
  } catch (error) {
    console.error("❌ Error in manageStock function:", error);
    results.success = false;
    results.errors.push({ error: error.message });
    return results;
  }
};

/**
 * Validate stock availability for order items without modifying inventory.
 * @param {Array} items - Items to validate.
 * @param {Object} productMap - Map of product ID to product document.
 * @returns {Object} Result of the check.
 */
export const validateStockAvailability = (items, productMap) => {
  for (const item of items) {
    const productId = item.productId || item._id;
    const quantity = Number(item.quantity || 0);
    const variantId = item.variantId;

    if (!productId || quantity <= 0) continue;

    const product = productMap[productId.toString()];
    if (!product) {
      return {
        success: false,
        message: `Product not found: ${productId}`,
        statusCode: 400,
      };
    }

    const productName = product.title || product.name;
    let availableStock = 0;

    if (product.productType === 'variable' && product.variants && product.variants.length > 0) {
      let variant = null;
      
      if (!variantId) {
         // Auto-select first available variant
         variant = product.variants.find(v => v.stockQuantity > 0) || product.variants[0];
         
         if (!variant) {
            return {
              success: false,
              message: `No available variants for ${productName}`,
              productId,
              productName,
              statusCode: 400,
            };
         }
      } else {
         variant = product.variants.id(variantId);
      }

      if (!variant) {
        console.warn(`⚠️ Stock Check: Variant not found for ${productName} (Variant ID: ${variantId})`);
        return {
          success: false,
          message: `Selected variant not found for ${productName}`,
          productId,
          productName,
          statusCode: 400,
        };
      }
      availableStock = variant.stockQuantity;
    } else {
      availableStock = product.baseStock !== undefined ? product.baseStock : (product.stock || 0);
    }

    if (availableStock < quantity) {
      console.warn(`⚠️ Stock Check: Insufficient stock for ${productName}. Available: ${availableStock}, Requested: ${quantity}`);
      return {
        success: false,
        message: `Insufficient stock for ${productName}. Available: ${availableStock}, Requested: ${quantity}`,
        productId,
        productName: productName,
        available: availableStock,
        requested: quantity,
        statusCode: 400,
      };
    }
  }

  return { success: true };
};

/**
 * Validate user eligibility and store restrictions for Cash-on-Delivery (COD).
 * @returns {Object} Result showing if COD is allowed or has a restriction message.
 */
export const checkCODEligibility = async ({ userId, items, shippingZip, codSettings, productMap }) => {
  // 🛡️ Check return and cancellation history concurrently
  const [returnCount, cancelCount] = await Promise.all([
    Order.countDocuments({
      userId,
      orderStatus: { $in: ["RETURN", "RETURN_REQUESTED", "RETURNED"] }
    }),
    Order.countDocuments({
      userId,
      orderStatus: "CANCELLED"
    })
  ]);

  if (returnCount > 2) {
    return {
      allowed: false,
      message: "Cash on Delivery is no longer available for your account due to excessive returns history."
    };
  }

  if (cancelCount >= 2) {
    return {
      allowed: false,
      message: "Cash on Delivery is no longer available for your account due to multiple cancelled orders."
    };
  }

  if (!codSettings || !codSettings.enabled) {
    return {
      allowed: false,
      message: "Cash on Delivery is currently disabled for this store."
    };
  }

  // Check Product-Specific Rules (Blocking & Validation)
  for (const item of items) {
    const pid = (item.productId?._id || item.productId || item._id).toString();
    
    // Check 1: Global Settings Map (codSettings.productRules)
    const rule = codSettings.productRules ? codSettings.productRules[pid] : null;
    if (rule && rule.blocked) {
       const pName = item.product_name || item.name || item.title || "one of the items";
       return {
         allowed: false,
         message: `Cash on Delivery is not available for product: ${pName}`
       };
    }

    // Check 2: Product Document Filter (flags.codBlocked)
    const productDoc = productMap[pid];
    if (productDoc && productDoc.flags?.codBlocked) {
       const pName = productDoc.title || item.product_name || "one of the items";
       return {
         allowed: false,
         message: `Cash on Delivery is unavailable for: ${pName}`
       };
    }
  }

  // Check Pincode
  const postalCode = shippingZip ? String(shippingZip).trim() : "";
  
  // Check Blocked List (Always applies if present)
  if (codSettings.blockedPincodes?.includes(postalCode)) {
    return {
      allowed: false,
      message: "Cash on Delivery is currently unavailable for your pincode."
    };
  }

  // Check Allow List (If strict mode is enabled)
  if (!codSettings.allowAllPincodes) {
    if (!postalCode) {
      return {
        allowed: false,
        message: "Pincode is required to check COD availability."
      };
    }

    const isAllowed = codSettings.allowedPincodes?.includes(postalCode);
    if (!isAllowed) {
      return {
        allowed: false,
        message: `Cash on Delivery is not currently available for your location (${postalCode})`
      };
    }
  }

  return { allowed: true };
};

/**
 * Calculate the advance COD payment amount if required by store configuration.
 * @param {number} amount - Total amount of order.
 * @param {Object} codSettings - Store COD settings.
 * @returns {number} The computed advance payment amount.
 */
export const calculateAdvanceCODAmount = (amount, codSettings) => {
  let advanceAmount = 0;
  if (codSettings?.advanceAmountEnabled) {
    if (codSettings.advanceAmountType === 'percentage') {
      advanceAmount = Math.ceil((amount * (codSettings.advanceAmountValue || 0)) / 100);
    } else {
      advanceAmount = codSettings.advanceAmountValue || 0;
    }
  }
  return advanceAmount;
};

/**
 * Standardize item arrays into the MongoDB Order schema items structure.
 * @param {Array} items - Items array from user request or cart database.
 * @param {Object} productMap - Pre-fetched product mapping (optional).
 * @returns {Array} Formatted items.
 */
export const formatOrderItems = (items, productMap = {}) => {
  return items.map((item) => {
    const productId = item.productId?._id || item.productId || item._id;
    const productDoc = productMap[productId?.toString()];
    
    const price = Number(item.price || item.productId?.price || productDoc?.price || 0);

    let image = item.image || "";
    if (!image) {
      const pSource = item.productId || productDoc;
      if (pSource && (pSource.images || pSource.image)) {
        image = Array.isArray(pSource.images)
          ? pSource.images[0]
          : pSource.image;
      }
    }

    const productName = item.product_name || item.name || item.productName || item.productId?.name || item.productId?.title || productDoc?.name || productDoc?.title || "Unnamed Product";

    return {
      discount: item.discount || 0,
      image,
      price,
      product_name: productName,
      productId,
      variantId: item.variantId,
      quantity: Number(item.quantity || 1),
    };
  });
};

/**
 * Calculate optimal discounts from active offers on order items.
 * @param {Array} items - Order items.
 * @returns {Object} Contains subtotal, discount total, applied offers, and items.
 */
export const calculateOrderDiscounts = async (items) => {
  const now = new Date();
  const activeOffers = await Offer.find({
    endDate: { $gte: now },
    startDate: { $lte: now },
    status: 'active',
  }).lean();

  let calculatedSubtotal = 0;
  let totalDiscount = 0;
  const appliedOffers = [];

  // Pre-fetch all products
  const productIdsToFetch = items.map(item => item.productId).filter(id => id);
  const productsList = await Product.find({ _id: { $in: productIdsToFetch } }).lean();
  const productMap = productsList.reduce((acc, p) => {
    acc[p._id.toString()] = p;
    return acc;
  }, {});

  const processedItems = items.map((item) => {
    const product = productMap[item.productId?.toString()];
    if (!product) return { ...item, finalPrice: item.price };

    calculatedSubtotal += item.price * item.quantity;

    const eligibleOffers = activeOffers.filter(offer => {
      if (offer.scope === 'all') return true;
      if (offer.scope === 'product' && offer.appliesToProducts.some(pId => pId.equals(product._id))) return true;
      if (offer.scope === 'category' && product.categoryId.some(catId => offer.appliesToCategories.some(oCatId => oCatId.equals(catId)))) return true;
      return false;
    });

    let bestOffer = null;
    let maxItemDiscount = 0;

    eligibleOffers.forEach(offer => {
      let currentItemDiscount = 0;
      if (offer.discountType === 'percentage') {
        let discountPerItem = (item.price * offer.discountValue) / 100;
        if (offer.maxDiscountAmount) {
          discountPerItem = Math.min(discountPerItem, offer.maxDiscountAmount);
        }
        currentItemDiscount = discountPerItem * item.quantity;
      } else if (offer.discountType === 'fixed') {
        currentItemDiscount = offer.discountValue * item.quantity;
      } else if (offer.discountType === 'bogo' && offer.buyQuantity > 0 && offer.getQuantity > 0) {
        const itemsInOneSet = offer.buyQuantity + offer.getQuantity;
        if (item.quantity >= itemsInOneSet) {
          const numberOfSets = Math.floor(item.quantity / itemsInOneSet);
          currentItemDiscount = numberOfSets * offer.getQuantity * item.price;
        }
      }

      if (currentItemDiscount > maxItemDiscount) {
        maxItemDiscount = currentItemDiscount;
        bestOffer = offer;
      }
    });

    if (bestOffer) {
      totalDiscount += maxItemDiscount;
      appliedOffers.push({ discountAmount: maxItemDiscount, offerCode: bestOffer.offerCode, offerId: bestOffer._id });
    }

    return item;
  });

  return {
    processedItems,
    calculatedSubtotal,
    totalDiscount,
    appliedOffers
  };
};

/**
 * Fetch product documents for the given items and returns them in a Map by ID.
 * @param {Array} items - Order or cart items.
 * @returns {Promise<Object>} Map of product ID string to product document.
 */
export const getProductMapForItems = async (items) => {
  const productIdsToFetch = items
    .map(item => item.productId || item._id)
    .filter(id => id);
  const productsList = await Product.find({ _id: { $in: productIdsToFetch } }).lean();
  return productsList.reduce((acc, p) => {
    acc[p._id.toString()] = p;
    return acc;
  }, {});
};

/**
 * Helper to trigger store owner notifications for order lifecycle events.
 * 
 * @param {Object} params
 * @param {string} params.ownerId - Store owner ID.
 * @param {string} params.type - Notification type (e.g. 'NEW_ORDER', 'ORDER_CANCELLED', 'RETURN_REQUESTED').
 * @param {Object} params.order - Order document.
 * @param {string} [params.reason] - Cancellation or return reason.
 * @param {number} [params.amount] - Custom order amount if any.
 */
export const triggerOwnerNotificationHelper = async ({ ownerId, type, order, reason, amount }) => {
  try {
    let title = "";
    let message = "";
    
    switch (type) {
      case "NEW_ORDER":
        if (order.paymentMethod === "COD" || order.paymentMethod === "CASH_ON_DELIVERY") {
          title = "New COD Order Received";
          message = `You have a new COD order ${order.orderNumber} for ₹${amount || order.totalAmount}`;
        } else {
          title = "New Paid Order Received";
          message = `You have a new paid order ${order.orderNumber} for ₹${amount || order.totalAmount}`;
        }
        break;
      case "ORDER_CANCELLED":
        title = "Order Cancelled by Customer";
        message = `Order ${order.orderNumber} has been cancelled by the customer. Reason: ${reason || "Not specified"}`;
        break;
      case "RETURN_REQUESTED":
        title = "Order Return Requested";
        message = `A return has been requested for order ${order.orderNumber}. Reason: ${reason || "Not specified"}`;
        break;
      default:
        title = "Order Updated";
        message = `Order ${order.orderNumber} status changed to ${type}`;
    }
    
    await createOwnerNotification({
      ownerId,
      type,
      title,
      message,
      orderId: order._id
    });
  } catch (err) {
    console.error("Owner notification helper error:", err);
  }
};

/**
 * Helper to fetch dependencies and send order confirmation email.
 * 
 * @param {string} orderId - Order ID.
 * @param {string} [userEmail] - Optional pre-fetched user email.
 * @param {Object} [owner] - Optional pre-fetched owner configuration.
 */
export const sendOrderEmailHelper = async (orderId, userEmail = null, owner = null) => {
  try {
    let finalEmail = userEmail;
    let finalOwner = owner;
    
    // Fetch order if dependencies are missing
    let order = null;
    if (!finalEmail || !finalOwner) {
      order = await Order.findById(orderId).populate("userId", "email ownerId");
      if (order && order.userId) {
        finalEmail = order.userId.email;
      }
    } else {
      order = await Order.findById(orderId);
    }
    
    if (!order) return;
    
    if (!finalEmail) {
      console.warn("No user email found to send confirmation email.");
      return;
    }
    
    if (!finalOwner) {
      const ownerId = order.userId?.ownerId || order.ownerId;
      if (ownerId) {
        finalOwner = await Owner.findById(ownerId).select('+settings.notificationSettings.emailPass +settings.notificationSettings.emailUser');
      }
    }
    
    if (finalOwner) {
      await sendOrderConfirmationEmail(finalEmail, order, finalOwner);
    }
  } catch (err) {
    console.error("Order confirmation email helper error:", err);
  }
};
