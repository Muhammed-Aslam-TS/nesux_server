import { Router } from "express";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireOwnerOrAdmin } from "../../middlewares/authCheck.js";
import {
  createAddon,
  getAddonsByOwner,
  updateAddon,
  deleteAddon,
  assignAddonsToProduct,
  removeAddonFromProduct,
} from "../../controllers/owner/addonController.js";

const addonRouter = Router();

// All addon routes require owner or admin authentication
addonRouter.use(verifyAccessToken);
addonRouter.use(requireOwnerOrAdmin);

// Routes for managing addons themselves
addonRouter.route("/").post(createAddon).get(getAddonsByOwner);
addonRouter.route("/:addonId").put(updateAddon).delete(deleteAddon);

// Routes for managing the relationship between addons and products
addonRouter.post("/product/:productId", assignAddonsToProduct);
addonRouter.delete("/product/:productId/:addonId", removeAddonFromProduct);

export default addonRouter;