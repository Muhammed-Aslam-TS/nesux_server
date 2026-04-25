import express from "express";
import { getOfferById, getOffers, getRelatedOffers, getTimeOffers } from "../../controllers/owner/offerControlles.js";
import { tenantResolver } from "../../middlewares/tenantResolver.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";

const userOfferRouter = express.Router();

// This route is public and uses the tenantResolver to find the store via domain.
// It then calls the getOffers controller which can handle public requests.
userOfferRouter.get("/", tenantResolver, verifyAccessToken, getOffers);

// You can also expose other public offer-related endpoints here.
userOfferRouter.get("/time-based", tenantResolver, verifyAccessToken, getTimeOffers);
userOfferRouter.get("/:id", tenantResolver, verifyAccessToken, getOfferById);
userOfferRouter.get("/related/:productId", tenantResolver, verifyAccessToken, getRelatedOffers);

export default userOfferRouter;