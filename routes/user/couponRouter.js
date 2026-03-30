import express from "express";
import { applyCoupon } from "../../controllers/users/couponController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireUser } from "../../middlewares/authCheck.js";

const router = express.Router();

router.post("/apply", verifyAccessToken, requireUser, applyCoupon);

export default router;
