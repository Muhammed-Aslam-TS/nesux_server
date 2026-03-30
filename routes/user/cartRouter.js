
import express from "express";
import { addToCart, clearCart, GetCartCount, getCartProducts, removeFromCart, updateCartProduct } from "../../controllers/users/cartController.js";
import { applyCoupon } from "../../controllers/users/couponController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireUser } from "../../middlewares/authCheck.js";

const cartRouter = express.Router();

// All cart routes require authentication
cartRouter.use(verifyAccessToken);
cartRouter.use(requireUser);

cartRouter.post("/add", addToCart);
cartRouter.get("/", getCartProducts);   
cartRouter.put("/:id", updateCartProduct);
cartRouter.delete("/:id", removeFromCart);
cartRouter.delete("/", clearCart); // DELETE /api/cart to clear the whole cart
cartRouter.get("/count", GetCartCount);
cartRouter.post("/coupon", applyCoupon); // POST /api/cart/coupon to apply a coupon

// cartRouter.post("/checkout", checkout);

export default cartRouter;
