import express from "express";
import { createCoupon, deleteCoupon, getCoupons, updateCoupon } from "../../controllers/owner/couponController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireOwnerOrAdmin } from "../../middlewares/authCheck.js";

const couponRoutes = express.Router();

// All coupon routes require authentication (owner or admin)
couponRoutes.use(verifyAccessToken);
couponRoutes.use(requireOwnerOrAdmin);

couponRoutes.get("/", getCoupons);
couponRoutes.post("/", createCoupon);
couponRoutes.put("/:id", updateCoupon);
couponRoutes.delete("/:id", deleteCoupon);

export default couponRoutes;
