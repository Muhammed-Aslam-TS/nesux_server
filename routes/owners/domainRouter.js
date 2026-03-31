import { Router } from "express";
import {
  addDomain,
  checkDomain,
  deleteDomain,
  getDomainSettings,
  setPrimaryDomain,
  verifyDomain,
  triggerSsl,
} from "../../controllers/owner/domainController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireOwner } from "../../middlewares/authCheck.js";

const router = Router();

// Public route for Caddy/SSL checks (unauthenticated)
router.get("/check", checkDomain);

// Protected routes (require login)
router.use(verifyAccessToken);
router.use(requireOwner);

router.route("/")
  .get(getDomainSettings)
  .post(addDomain)
  .put(setPrimaryDomain)
  .delete(deleteDomain);

router.post("/verify", verifyDomain);
router.post("/trigger-ssl", triggerSsl);

export default router;