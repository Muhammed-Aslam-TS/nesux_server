import { Router } from 'express';
import {
  createShiprocketOrderController,
  checkServiceability,
  trackShipmentController,
  getCourierRatesController,
  getOrderTracking,
  getOrderWithTracking,
  testShiprocketConnection,
  cancelShiprocketOrder,
  getCourierList,
  getShiprocketOrderDetails,
  updateOrderStatusFromWebhook,
  getPickupLocationsController,
  generateAWBController,
  generateLabelController,
  getShipmentServiceabilityController
} from '../../controllers/owner/shiprocketController.js';
import shiprocketWebhook from '../../middlewares/shiprocketWebhook.js';
import { verifyAccessToken } from '../../middlewares/JWT.js';
import { requireUserOrOwner } from '../../middlewares/authCheck.js';

const shiprocketRouter = Router();

// All shiprocket routes require authentication
shiprocketRouter.use(verifyAccessToken);
shiprocketRouter.use(requireUserOrOwner);

// Test connection
shiprocketRouter.get('/test-connection', testShiprocketConnection);

// Courier and serviceability
shiprocketRouter.post('/serviceability', checkServiceability);
shiprocketRouter.get('/shipment-serviceability/:shipmentId', getShipmentServiceabilityController);
shiprocketRouter.post('/rates', getCourierRatesController);
shiprocketRouter.get('/couriers', getCourierList);

// Order management
shiprocketRouter.post('/create-order/:orderId', createShiprocketOrderController);
shiprocketRouter.get('/order-details/:orderId', getShiprocketOrderDetails);
shiprocketRouter.post('/cancel-order/:orderId', cancelShiprocketOrder);

// Tracking
shiprocketRouter.get('/track/:shipmentId', trackShipmentController);
shiprocketRouter.get('/order-tracking/:orderId', getOrderTracking);
shiprocketRouter.get('/order-with-tracking/:orderId', getOrderWithTracking);

// Pickup Locations
shiprocketRouter.get('/pickup-locations', getPickupLocationsController);

// Generate AWB & Label
shiprocketRouter.post('/generate-awb', generateAWBController);
shiprocketRouter.post('/generate/label', generateLabelController);

// Status Sync (matches frontend call)
shiprocketRouter.get('/orders/:shipmentId/status', trackShipmentController);

// Cancel Order (Specific for AWB based)
// shiprocketRouter.post('/orders/cancel', cancelShiprocketOrder); // Verify controller compatibility


// Webhook for status updates (validates signature then processes)
// Public endpoint used by Shiprocket - do NOT require auth
shiprocketRouter.post('/webhook/status-update', shiprocketWebhook.validateWebhookSignature, shiprocketWebhook.processShiprocketWebhook);

export default shiprocketRouter; 