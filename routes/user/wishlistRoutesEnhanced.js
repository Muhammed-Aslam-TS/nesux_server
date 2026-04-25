import express from "express";
import {
  // Basic wishlist functions
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  clearWishlist,
  moveToCart,
  getWishlistCount,
  checkWishlistStatus
} from "../../controllers/users/wishlistController.js";

import {
  // Enhanced wishlist functions
  addToWishlistEnhanced,
  removeFromWishlistEnhanced,
  getWishlistEnhanced,
  bulkWishlistOperations,
  getWishlistAnalytics
} from "../../controllers/users/wishlistControllerEnhanced.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireUser } from "../../middlewares/authCheck.js";


const wishlistRouterEnhanced = express.Router();

// All routes require authentication
wishlistRouterEnhanced.use(verifyAccessToken);
wishlistRouterEnhanced.use(requireUser);

// ===== BASIC WISHLIST OPERATIONS =====

// Add product to wishlist
wishlistRouterEnhanced.post("/add", addToWishlist);

// Remove product from wishlist
wishlistRouterEnhanced.delete("/remove/:productId", removeFromWishlist);

// Get user's wishlist
wishlistRouterEnhanced.get("/", getWishlist);

// Clear entire wishlist
wishlistRouterEnhanced.delete("/clear", clearWishlist);

// Move wishlist item to cart
wishlistRouterEnhanced.post("/move-to-cart/:productId", moveToCart);

// Get wishlist count
wishlistRouterEnhanced.get("/count", getWishlistCount);

// Check if product is in wishlist
wishlistRouterEnhanced.get("/check/:productId", checkWishlistStatus);

// ===== ENHANCED WISHLIST OPERATIONS =====

// Enhanced add to wishlist (with validation and summary)
wishlistRouterEnhanced.post("/add-enhanced", addToWishlistEnhanced);

// Enhanced remove from wishlist (with summary)
wishlistRouterEnhanced.delete("/remove-enhanced/:productId", removeFromWishlistEnhanced);

// Enhanced get wishlist (with summary and analytics)
wishlistRouterEnhanced.get("/enhanced", getWishlistEnhanced);

// Bulk operations on wishlist
wishlistRouterEnhanced.post("/bulk-operations", bulkWishlistOperations);

// Get wishlist analytics
wishlistRouterEnhanced.get("/analytics", getWishlistAnalytics);

// ===== ALIAS ROUTES FOR BACKWARD COMPATIBILITY =====

// Alternative route names for flexibility
wishlistRouterEnhanced.post("/add-to-wishlist", addToWishlist);
wishlistRouterEnhanced.delete("/delete/:productId", removeFromWishlist);
wishlistRouterEnhanced.get("/list", getWishlist);
wishlistRouterEnhanced.get("/status/:productId", checkWishlistStatus);

export default wishlistRouterEnhanced;
