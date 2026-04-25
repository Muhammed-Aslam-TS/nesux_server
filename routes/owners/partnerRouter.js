import express from "express";
import {
  createPartner,
  getOwnerPartners,
  updatePartner,
  deletePartner,
  togglePartnerStatus,
} from "../../controllers/owner/partnerController.js";
import { tenantMiddleware } from "../../controllers/owner/tenantMiddleware.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";

const router = express.Router();

router.use(verifyAccessToken);
router.use(tenantMiddleware);

router.post("/", createPartner);
router.get("/", getOwnerPartners);
router.put("/:id", updatePartner);
router.delete("/:id", deletePartner);
router.patch("/:id/toggle-status", togglePartnerStatus);

export default router;
