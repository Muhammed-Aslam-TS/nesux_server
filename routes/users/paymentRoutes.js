import express from 'express';
import { createPaymentOrder, verifyAndProcessPayment } from '../../controllers/users/orderController.js';
import { verifyAccessToken } from '../../middlewares/JWT.js';
import { requireUser } from '../../middlewares/authCheck.js';
// import { createPaymentOrder, verifyAndProcessPayment, getPaymentStatus } from '../../controllers/users/paymentController.js';

const paymentRoutes = express.Router(); 

// All payment routes require authentication
paymentRoutes.use(verifyAccessToken);
paymentRoutes.use(requireUser);

// Create payment order
paymentRoutes.post('/create-order',  createPaymentOrder);

// Verify payment
paymentRoutes.post('/verify-payment', verifyAndProcessPayment);

// Get payment status
// paymentRoutes.get('/status/:orderId', getPaymentStatus);

export default paymentRoutes; 