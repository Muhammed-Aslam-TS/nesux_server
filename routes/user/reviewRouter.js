import { Router } from "express";

import { requireUser } from "../../middlewares/authCheck.js";
import { createReview, getProductReviews, updateReview, deleteReview, getHighRatedTestimonials } from "../../controllers/users/reviewController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";

const reviewRouter = Router({ mergeParams: true });

reviewRouter.get("/getHighRatedTestimonials", getHighRatedTestimonials);
reviewRouter.post("/:Id", verifyAccessToken, requireUser, createReview);
reviewRouter.get("/:Id", getProductReviews);

reviewRouter.route("/:reviewId")
  .put(verifyAccessToken, requireUser, updateReview)
  .delete(verifyAccessToken, requireUser, deleteReview);

export default reviewRouter;