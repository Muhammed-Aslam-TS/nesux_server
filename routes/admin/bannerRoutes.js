import express from "express";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireOwnerOrAdmin } from "../../middlewares/authCheck.js";
import { updateBannerOrder } from "../../controllers/owner/bannerController.js";

// Assuming you have other banner controllers, you would import them here
// import { getBanners, createBanner, updateBanner, deleteBanner } from "../../controllers/admin/bannerController.js";

const bannerRoutes = express.Router();

// All banner management routes should be protected
bannerRoutes.use(verifyAccessToken);
bannerRoutes.use(requireOwnerOrAdmin);

// Route for updating the order of all banners
bannerRoutes.put("/order", updateBannerOrder);

// Add your other banner routes here, for example:
// bannerRoutes.get("/", getBanners);
// bannerRoutes.post("/", createBanner);

export default bannerRoutes;