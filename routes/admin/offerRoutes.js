import express from "express";
import {
  addOffer,
  checkProductEligibility,
  deleteOffer,
  fetchOffers,
  getPublicActiveOffers,
  updateOffer,
} from "../../controllers/admin/offerController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireOwnerOrAdmin } from "../../middlewares/authCheck.js";

const offerRoutes = express.Router();

// --- Public Routes ---
offerRoutes.get("/public", getPublicActiveOffers);
offerRoutes.get("/check-eligibility/:productId", checkProductEligibility);

// --- Admin/Owner Protected Routes ---
offerRoutes.use(verifyAccessToken);
offerRoutes.use(requireOwnerOrAdmin);

offerRoutes.post("/", addOffer);
offerRoutes.get("/", fetchOffers);
offerRoutes.put("/:id", updateOffer);
offerRoutes.delete("/:id", deleteOffer);

export default offerRoutes;