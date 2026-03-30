


import express from "express";
import { initializeSubscriptionPayment, verifySubscriptionPayment, getSubscriptionDetails } from "../../controllers/owner/subscriptionController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireOwner } from "../../middlewares/authCheck.js";

const Subscriptionsrouter = express.Router();

// All owner subscription routes require authentication
Subscriptionsrouter.use(verifyAccessToken);
Subscriptionsrouter.use(requireOwner);

// Update order status
Subscriptionsrouter.get("/",  getSubscriptionDetails);
Subscriptionsrouter.put("/initializeSubscriptionPayment",  initializeSubscriptionPayment);
Subscriptionsrouter.post('/verify-payment', verifySubscriptionPayment);

// Get order statuses
// Subscriptionsrouter.get("/statuses", getOrderStatuses);

export default Subscriptionsrouter;