import { Router } from 'express';
import { verifyAccessToken } from '../../middlewares/JWT.js';
import { requireOwner } from '../../middlewares/authCheck.js';
import { createProduct, getAllProducts, getProductById, hardDeleteProduct, softDeleteProduct, updateProduct } from '../../controllers/owner/productController.js';
import upload from '../../middlewares/upload.js';

const Productrouter = Router();

// All owner product routes require authentication
Productrouter.use(verifyAccessToken);
Productrouter.use(requireOwner);

// Get all products
Productrouter.get('/', getAllProducts);

// Create and update products
Productrouter.post("/", upload.any(), createProduct);
Productrouter.put("/:id", upload.any(), updateProduct);
Productrouter.delete("/:id", hardDeleteProduct);
Productrouter.put("/soft-delete/:id", softDeleteProduct);
Productrouter.get("/:id", getProductById);

export default Productrouter;
