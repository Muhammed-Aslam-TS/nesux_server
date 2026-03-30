

import { Router } from 'express';

import { getAllProducts, GetProductByCategory, GetProductById, GetTrendingProducts } from '../../controllers/users/productController.js';
import { verifyAccessToken } from '../../middlewares/JWT.js';
import { tenantResolver } from '../../middlewares/tenantResolver.js';

const UserProductrouter = Router();

// These routes are now public-first.
// 1. They resolve the tenant by domain.
// 2. They check for an optional auth token.
// 3. The controller decides what to show based on whether a user is logged in or not.

UserProductrouter.get('/', tenantResolver, verifyAccessToken, getAllProducts);
UserProductrouter.get('/trending', tenantResolver, verifyAccessToken, GetTrendingProducts);
UserProductrouter.get('/category/:categoryId', tenantResolver, verifyAccessToken, GetProductByCategory);
UserProductrouter.get('/:id', tenantResolver, verifyAccessToken, GetProductById);

export default UserProductrouter;