import { Router } from "express";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireOwner } from "../../middlewares/authCheck.js";
import { getOwnerReviews, deleteReviewByOwner, updateReviewByOwner, createReviewByOwner } from "../../controllers/owner/reviewController.js";

const router = Router();

// All routes here require owner authentication
router.use(verifyAccessToken, requireOwner);

router.post("/", createReviewByOwner);
router.get("/all", getOwnerReviews);
router.delete("/:reviewId", deleteReviewByOwner);
router.put("/:reviewId", updateReviewByOwner);

export default router;
