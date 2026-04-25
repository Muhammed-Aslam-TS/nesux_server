import express from "express";
import {
  createOffer,
  deleteOffer,
  getOfferById,
  getOffers,
  updateOffer,
} from "../../controllers/owner/offerControlles.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireOwnerOrAdmin } from "../../middlewares/authCheck.js";

const offerRouter = express.Router();

// Apply owner protection to all these routes
offerRouter.use(verifyAccessToken);
offerRouter.use(requireOwnerOrAdmin);

// Routes for managing offers
offerRouter.get("/", getOffers);
offerRouter.post("/", createOffer);
offerRouter.get("/:id", getOfferById);
offerRouter.put("/:id", updateOffer);
offerRouter.delete("/:id", deleteOffer);

export default offerRouter;
