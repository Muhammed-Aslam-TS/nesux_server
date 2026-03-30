import express from "express";
import {  deleteCategory, getAllCategories, getCategoryById, updateCategory } from "../../controllers/owner/categoryController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { tenantResolver } from "../../middlewares/tenantResolver.js";
import { getPublicProductsByCategory } from "../../controllers/owner/productController.js";

const CategoryByUsersRoutes = express.Router();

// This route is now public-first.
CategoryByUsersRoutes.get("/", tenantResolver, verifyAccessToken, getAllCategories);

// This route is for fetching all products belonging to a specific category.
CategoryByUsersRoutes.get("/:categoryId/products", tenantResolver, verifyAccessToken, getPublicProductsByCategory);


export default CategoryByUsersRoutes;
