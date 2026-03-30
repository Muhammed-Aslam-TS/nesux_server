import express from "express";
import {
    createOrder,
  createCODOrder,
    getUserOrders,
    verifyAndProcessPayment,
    getOrderDetailsWithTracking,
    getOrderDetails,
    cancelOrder,
    generateInvoice,
  } from "../../controllers/users/orderController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireUser } from "../../middlewares/authCheck.js";

const OrdersRouter = express.Router();

// All order routes require authentication
OrdersRouter.use(verifyAccessToken);
OrdersRouter.use(requireUser);

OrdersRouter.post("/createOrder", createOrder);
// Create Cash on Delivery order
// Mounted path: /api/user/orders -> so COD endpoint becomes POST /api/user/orders/cod
OrdersRouter.post('/cod', createCODOrder);
// OrdersRouter.post('/verify-payment', verifyAndProcessPayment);

// Get all users
OrdersRouter.get("/user", getUserOrders);

// Get single order details
OrdersRouter.get("/:id", getOrderDetails);

// Generate and download invoice for an order
OrdersRouter.get("/:orderId/generate-invoice", generateInvoice);

// Cancel order
OrdersRouter.put("/:orderId/cancel", express.json(), cancelOrder);

// Get order details with tracking for order success page
OrdersRouter.get("/:id/with-tracking", getOrderDetailsWithTracking);

export default OrdersRouter;
