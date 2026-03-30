import express from "express";
import {
  createTestimonial,
  getOwnerTestimonials,
  updateTestimonial,
  deleteTestimonial,
  toggleTestimonialStatus,
} from "../../controllers/owner/testimonialController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireOwner } from "../../middlewares/authCheck.js";

const testimonialRouter = express.Router();

// Apply auth middleware to ensure owner is logged in
testimonialRouter.use(verifyAccessToken, requireOwner);

testimonialRouter.get("/", getOwnerTestimonials);
testimonialRouter.post("/", createTestimonial);
testimonialRouter.put("/:id", updateTestimonial);
testimonialRouter.delete("/:id", deleteTestimonial);
testimonialRouter.patch("/:id/toggle-status", toggleTestimonialStatus);

export default testimonialRouter;
