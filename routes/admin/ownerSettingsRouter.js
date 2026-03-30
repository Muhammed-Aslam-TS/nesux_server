import { Router } from "express";
import {
  getLogo,
  getOwnerInfo,
  updateOwnerInfo,
} from "../../controllers/owner/ownerController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireAdmin } from "../../middlewares/authCheck.js";
import upload from "../../middlewares/upload.js";
import { checkSubscription } from "../../middlewares/subscription.js";
import { getOwnerSubscription } from "../../controllers/owner/subscriptionController.js";

const ownerSettings = Router();

// All admin owner settings routes require authentication
ownerSettings.use(verifyAccessToken);
ownerSettings.use(requireAdmin);

ownerSettings.get("/", getOwnerInfo);
ownerSettings.put("/", upload.single("images"), updateOwnerInfo);
ownerSettings.get("/logo", getLogo);

// ownerSettings.get("/subscriptionPlans", getOwnerSubscription);

ownerSettings.put("/update", checkSubscription, updateOwnerInfo);

export default ownerSettings;
