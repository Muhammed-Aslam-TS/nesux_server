import express from "express";
import {
  createBanner,
  deleteBanner,
  getBannerById,
  getBanners,
  updateBanner,
  updateBannerOrder,
} from "../../controllers/owner/bannerController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireOwner } from "../../middlewares/authCheck.js";

const bannerRouter = express.Router();

// All banner routes require owner authentication
bannerRouter.use(verifyAccessToken);
bannerRouter.use(requireOwner);

// Route to get all banners and create a new banner
bannerRouter.route("/").get(getBanners).post(createBanner);
bannerRouter.route("/update-order").put(updateBannerOrder);


// Routes for a specific banner by ID
bannerRouter.route("/:bannerId").get(getBannerById).put(updateBanner).delete(deleteBanner);

export default bannerRouter;