import express from "express";
import {
  createCoupon,
  getCoupons,
  updateCoupon,
  deleteCoupon,
} from "../../controllers/owner/couponController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireOwnerOrAdmin } from "../../middlewares/authCheck.js";

const couponRouter = express.Router();

// Apply owner protection to all these routes
couponRouter.use(verifyAccessToken);
couponRouter.use(requireOwnerOrAdmin);

// Routes for managing coupons
couponRouter.get("/", getCoupons);
couponRouter.post("/", createCoupon);
couponRouter.put("/:id", updateCoupon);
couponRouter.delete("/:id", deleteCoupon);

export default couponRouter;
