import { Router } from "express";
import {
  getLogo,
  getOwnerInfo,
  updateOwnerInfo,
  getOwnerLogoAsBase64,
} from "../../controllers/owner/ownerController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireOwner, requireOwnerOrAdmin } from "../../middlewares/authCheck.js";
import upload from "../../middlewares/upload.js";
import { checkSubscription } from "../../middlewares/subscription.js";
import { getCodStatus, toggleCod } from "../../controllers/owner/manageCod.js";
import { getShippingStats, toggleShipping } from "../../controllers/owner/manageShipping.js";

const ownerInfoRouter = Router();

// All owner info routes require authentication (user or owner)
ownerInfoRouter.use(verifyAccessToken);

ownerInfoRouter.use(requireOwnerOrAdmin);
ownerInfoRouter.get("/", getOwnerInfo);

// Get owner information

// Update owner information
ownerInfoRouter.put("/", upload.single("images"), updateOwnerInfo);

// Get owner logo
ownerInfoRouter.get("/logo", getLogo);

// Get owner logo as Base64 (Proxy to avoid CORS)
ownerInfoRouter.get("/logo-base64", getOwnerLogoAsBase64);

// Update owner info with subscription check
ownerInfoRouter.put("/update", checkSubscription, updateOwnerInfo);

// Manage COD
ownerInfoRouter.get("/cod", getCodStatus);
ownerInfoRouter.put("/cod", toggleCod);

// Manage Shipping
ownerInfoRouter.get("/shipping", getShippingStats);
ownerInfoRouter.put("/shipping", toggleShipping);

export default ownerInfoRouter;
