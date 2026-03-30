

import { Router } from 'express';
import { verifyAccessToken } from '../../middlewares/JWT.js';
import { requireOwnerOrAdmin } from '../../middlewares/authCheck.js';
import { getSubscriptionDetails } from '../../controllers/admin/subscriptionController.js';



const subscriptionRouter = Router();

// Nested route for reviews

// All product routes require authentication (owner or admin)
subscriptionRouter.use(verifyAccessToken);
subscriptionRouter.use(requireOwnerOrAdmin);

// Get all products
subscriptionRouter.get('/', getSubscriptionDetails);

// Create a product with multiple images


export default subscriptionRouter;