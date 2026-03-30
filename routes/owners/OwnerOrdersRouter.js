import express from "express";
import { createShiprocketOrderfromOrder, getAllOrders, getOrderStatuses, updateOrderStatus, trackShipmentFromOrder, checkServiceability } from '../../controllers/owner/orderController.js';
import { bulkBookShiprocketOrders, cancelOrderShiprocket, getShiprocketLabel, getShiprocketInvoice, getShiprocketManifest, generateShiprocketAWB, requestShiprocketPickup, printShiprocketManifest, trackShipmentByAWB } from '../../controllers/owner/orderController.js';
import { verifyAccessToken } from '../../middlewares/JWT.js';
import { requireOwner } from '../../middlewares/authCheck.js';
import shiprocketWebhook from '../../middlewares/shiprocketWebhook.js';


const OwnerOrdersRouter = express.Router();

// All owner orders routes require authentication
OwnerOrdersRouter.use(verifyAccessToken);
OwnerOrdersRouter.use(requireOwner);

OwnerOrdersRouter.post("/createOrderShiprocket", createShiprocketOrderfromOrder);

// Bulk book Shiprocket for multiple orders (body: { orderIds: [...]} or { filter: {...} })
OwnerOrdersRouter.put('/bulk-book-shiprocket', bulkBookShiprocketOrders);

// Check Serviceability (GET with query params)
OwnerOrdersRouter.get('/shiprocket/serviceability', checkServiceability);

// Cancel Shiprocket Order
OwnerOrdersRouter.post('/cancel-shiprocket', cancelOrderShiprocket);

// Generate AWB (Assign Courier)
OwnerOrdersRouter.post('/shiprocket/generate-awb', generateShiprocketAWB);

// Get Label
OwnerOrdersRouter.get('/shiprocket/label/:shipmentId', getShiprocketLabel);

// Get Invoice (Shiprocket)
OwnerOrdersRouter.get('/shiprocket/invoice/:orderId', getShiprocketInvoice);

// Get Manifest
OwnerOrdersRouter.get('/shiprocket/manifest/:shipmentId', getShiprocketManifest);

// Track shipment by shipmentId
OwnerOrdersRouter.get('/track/:shipmentId', trackShipmentFromOrder);

// Track shipment by orderId
OwnerOrdersRouter.get('/track-by-order/:orderId', trackShipmentFromOrder);

// Track by AWB (Step 11)
OwnerOrdersRouter.get('/shiprocket/track-awb/:awbCode', trackShipmentByAWB);

// Request Pickup (Step 6)
OwnerOrdersRouter.post('/shiprocket/request-pickup', requestShiprocketPickup);

// Print Manifest (Step 8)
OwnerOrdersRouter.get('/shiprocket/print-manifest/:shipmentId', printShiprocketManifest);

// Get all orders
OwnerOrdersRouter.get("/", getAllOrders);

// Update order status
OwnerOrdersRouter.put("/:orderId/status",  updateOrderStatus);

// Manual sync Shiprocket status for an order (owner/admin)
OwnerOrdersRouter.put('/:orderId/sync', shiprocketWebhook.syncOrderStatus);

// Get order statuses
OwnerOrdersRouter.get("/statuses", getOrderStatuses);

export default OwnerOrdersRouter;