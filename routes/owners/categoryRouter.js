import express from "express";
import { createCategory, deleteCategory, getAllCategories, getCategoryById, getPublicTrendingCategories, updateCategory } from "../../controllers/owner/categoryController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireOwnerOrAdmin } from "../../middlewares/authCheck.js";
import upload from "../../middlewares/upload.js";

const CategoryRoutes = express.Router();

// All category routes require authentication (owner or admin)
CategoryRoutes.use(verifyAccessToken);
CategoryRoutes.use(requireOwnerOrAdmin);

CategoryRoutes.get("/categories", getAllCategories);
CategoryRoutes.post("/categories", upload.single("image"), createCategory);
CategoryRoutes.get("/categories/:id", getCategoryById);
CategoryRoutes.put("/categories/:id", upload.single("image"), updateCategory);

// Delete a category
CategoryRoutes.delete("/:id", deleteCategory);

export default CategoryRoutes;
