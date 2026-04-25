import express from "express";
import {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  clearWishlist,
  moveToCart,
  getWishlistCount,
  checkWishlistStatus
} from "../../controllers/users/wishlistController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireUser } from "../../middlewares/authCheck.js";


const wishlistRouter = express.Router();
wishlistRouter.use(verifyAccessToken);
wishlistRouter.use(requireUser);
// All routes require authentication


// Add product to wishlist
wishlistRouter.post("/add", addToWishlist);

// Remove product from wishlist
wishlistRouter.delete("/remove/:productId", removeFromWishlist);

// Get user's wishlist
wishlistRouter.get("/", getWishlist);

// Clear entire wishlist
wishlistRouter.delete("/clear", clearWishlist);

// Move wishlist item to cart
wishlistRouter.post("/move-to-cart/:productId", moveToCart);

// Get wishlist count
wishlistRouter.get("/count", getWishlistCount);

// Check if product is in wishlist
wishlistRouter.get("/check/:productId", checkWishlistStatus);

export default wishlistRouter;

