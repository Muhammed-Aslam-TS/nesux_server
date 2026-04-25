import { Router } from "express";
import { loginOwner, getOwnerByReferralCode } from "../../controllers/owner/ownerController.js";
import { getOwnerNotifications, markNotificationRead, markAllRead } from "../../controllers/owner/notificationController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireOwner } from "../../middlewares/authCheck.js";
import { getAllCategories } from "../../controllers/owner/categoryController.js";

const ownersRouter = Router();

// Owner login endpoint (Public)
ownersRouter.post("/login", loginOwner);

// Owner Notification endpoints (Protected)
ownersRouter.use(verifyAccessToken);
ownersRouter.use(requireOwner);

ownersRouter.get("/notifications", getOwnerNotifications);
ownersRouter.put("/notifications/:id/read", markNotificationRead);
ownersRouter.put("/notifications/mark-all-read", markAllRead);
ownersRouter.get("/getOwnerByReferralCode", getOwnerByReferralCode);


export default ownersRouter;