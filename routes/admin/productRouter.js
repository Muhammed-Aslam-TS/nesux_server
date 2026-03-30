

import { Router } from 'express';
import { verifyAccessToken } from '../../middlewares/JWT.js';
import { requireOwnerOrAdmin } from '../../middlewares/authCheck.js';
import { createProduct, getAllProducts, getProductById, hardDeleteProduct, softDeleteProduct, updateProduct } from '../../controllers/owner/productController.js';
import reviewRouter from '../user/reviewRouter.js';
import upload from '../../middlewares/upload.js';

const Productrouter = Router();

// Nested route for reviews

// All product routes require authentication (owner or admin)
Productrouter.use(verifyAccessToken);
Productrouter.use(requireOwnerOrAdmin);

// Get all products
Productrouter.get('/', getAllProducts);

// Create a product with multiple images
Productrouter.post("/", upload.any(), createProduct);
Productrouter.put("/:id", upload.any(), updateProduct);
Productrouter.delete("/:id", hardDeleteProduct);
Productrouter.put("/soft-delete/:id", softDeleteProduct);
Productrouter.get("/:id", getProductById);

export default Productrouter;