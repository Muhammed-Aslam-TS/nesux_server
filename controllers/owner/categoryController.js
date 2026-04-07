import Category from "../../model/categoryModels.js"; // Correct model
import { deleteFromFirebase } from "../../middlewares/base64Convert.js";
import { deleteFile, saveFile } from "../../utils/storageUtils.js";
import { getOwnerId } from "../../middlewares/getOwnerId.js";
import { v4 as uuidv4 } from "uuid";
import User from "../../model/usersModel.js";
import Product from "../../model/product.js";

import mongoose from "mongoose";

// Create a new category
export const createCategory = async (req, res) => {
  console.log(`[Category] Starting creation...`);
  try {
    // Standardized owner resolution (handles domain + auth context)
    const ownerIdRaw = getOwnerId(req);
    
    if (!ownerIdRaw) {
      console.warn(`[Category] Failed: Owner ID could not be resolved from request.`);
      return res.status(401).json({ message: "Store identity could not be verified." });
    }

    // Explicitly cast to ObjectId to ensure database compatibility
    const ownerId = new mongoose.Types.ObjectId(ownerIdRaw);
    console.log(`[Category] Resolved Owner ID: ${ownerId}`);

    const { categoryName, description, isTrending } = req.body;
    const imageFile = req.file;

    if (!categoryName || !imageFile) {
      return res.status(400).json({ message: "Category name and image are required." });
    }

    // Check for duplicate category
    const existingCategory = await Category.findOne({
      categoryName: categoryName.trim(),
      ownerId,
    });

    if (existingCategory) {
      console.log(`[Category] Duplicate blocked: ${categoryName} already exists for ${ownerId}`);
      return res.status(409).json({ message: "Category already exists." });
    }

    const buffer = imageFile.buffer;
    if (!buffer) {
       console.error(`[Category] Buffer is missing from request.file!`);
       return res.status(400).json({ message: "Invalid image upload. File buffer is missing." });
    }

    const fileName = `${uuidv4()}-${imageFile.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    console.log(`[Category] Attempting file save for: ${fileName}`);
    // This will try S3 first, then local fallback
    let downloadURL;
    try {
      downloadURL = await saveFile(buffer, 'categories', fileName);
    } catch (storageErr) {
      console.error(`[Category] Storage fatal error:`, storageErr);
      return res.status(500).json({ 
        message: "Failed to save category image.", 
        error: storageErr.message 
      });
    }

    console.log(`[Category] File saved at: ${downloadURL}. Now saving to DB...`);

    // Save new category
    const newCategory = new Category({
      categoryName: categoryName.trim(),
      description: description,
      isTrending: isTrending === 'true' || isTrending === true,
      image: downloadURL,
      ownerId,
    });

    const categoryData = await newCategory.save();
    
    console.log(`[Category] Creation successful! ID: ${categoryData._id}`);
    res.status(201).json(categoryData);
  } catch (error) {
    console.error("❌ Category creation FATAL error:", error);
    res.status(500).json({ 
      message: "Internal server error while creating category",
      error: error.message,
      errorType: error.name,
      debug: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
};
// Get all categories
export const getAllCategories = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);

    if (!ownerId) {
      return res
        .status(404)
        .json({ success: false, message: "Store not found for this domain." });
    }

    // Build the query. Owners see all categories, while visitors/users only see active ones.
    const query = { ownerId };
    // Assuming your Category model might have an 'isActive' field like banners.
    if (req.user?.userType !== "owner") {
      // query.isActive = true; // Add this if you have an isActive field in categoryModels.js
    }

    const categories = await Category.find(query);

    res.status(200).json({ success: true, categories: categories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single category by ID
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a category
export const updateCategory = async (req, res) => {
  console.log(`[Category] Starting update for ID: ${req.params.id}...`);
  try {
    const { id } = req.params;
    const { categoryName, description, isTrending } = req.body;
    const imageFile = req.file;

    // Basic ID validation
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid category ID format." });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (categoryName) category.categoryName = categoryName.trim();
    if (description !== undefined) category.description = description.trim();
    if (isTrending !== undefined) category.isTrending = isTrending === 'true' || isTrending === true;

    // Handle image update (if a new file is uploaded)
    if (imageFile) {
      const buffer = imageFile.buffer;
      const fileName = `${uuidv4()}-${imageFile.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      console.log(`[Category] New image uploaded. Deleting old image if it exists...`);
      // Delete old image if it exists
      if (category.image) {
        try {
          await deleteFile(category.image);
        } catch (delError) {
          console.warn(`[Category] Old image deletion failed (non-blocking):`, delError.message);
        }
      }
      category.image = await saveFile(buffer, 'categories', fileName);
    }

    const updatedCategory = await category.save();
    console.log(`[Category] Update successful!`);
    res.json(updatedCategory);
  } catch (error) {
    console.error("❌ Category update error:", error);
    res.status(500).json({ 
      message: "Internal server error while updating category",
      error: error.message,
      errorType: error.name
    });
  }
};

// Delete a category
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Delete image from storage
    if (category.image) {
      await deleteFile(category.image);
    }

    res.status(200).json({ message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPublicTrendingCategories = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) {
      return res
        .status(404)
        .json({ success: false, message: "Store not found for this domain." });
    }

    // Find all categories for this owner that are marked as trending
    const trendingCategories = await Category.find({ ownerId, isTrending: true });

    if (!trendingCategories || trendingCategories.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No trending categories found for this store.",
      });
    }

    res.status(200).json({ success: true, data: trendingCategories });
  } catch (err) {
    console.error("Error fetching public trending categories:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};