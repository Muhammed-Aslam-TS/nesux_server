import express from "express";
import { createCategory, deleteCategory, getAllCategories, getCategoryById, getPublicTrendingCategories, updateCategory } from "../../controllers/owner/categoryController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireOwnerOrAdmin } from "../../middlewares/authCheck.js";
import upload from "../../middlewares/upload.js";

const CategoryRoutes = express.Router();

// All category routes require authentication (owner or admin)
CategoryRoutes.use(verifyAccessToken);
CategoryRoutes.use(requireOwnerOrAdmin);

CategoryRoutes.get("/", getAllCategories);
CategoryRoutes.post("/", upload.single("image"), createCategory);
CategoryRoutes.get("/:id", getCategoryById);
CategoryRoutes.put("/:id", upload.single("image"), updateCategory);

// Delete a category
CategoryRoutes.delete("/:id", deleteCategory);

export default CategoryRoutes;
