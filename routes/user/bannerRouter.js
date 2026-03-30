import express from "express";
import { getStoreBanners, getCategoryBanners } from "../../controllers/owner/bannerController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { tenantResolver } from "../../middlewares/tenantResolver.js";

const userBannerRouter = express.Router();

// This route is now public-first.
// 1. It resolves the tenant by domain.
// 2. It checks for an optional auth token.
// 3. The controller decides what to show based on whether a user is logged in or not.
userBannerRouter.get("/", tenantResolver, getStoreBanners);
userBannerRouter.get("/category", tenantResolver, getCategoryBanners);
// userBannerRouter.get("/", tenantResolver, verifyAccessToken, getStoreBanners);

export default userBannerRouter;