import { Router } from "express";
import { loginOwner } from "../../controllers/owner/ownerController.js";
import { getOwnerNotifications, markNotificationRead, markAllRead } from "../../controllers/owner/notificationController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireOwner } from "../../middlewares/authCheck.js";

const ownersRouter = Router();

// Owner login endpoint (Public)
ownersRouter.post("/login", loginOwner);

// Owner Notification endpoints (Protected)
ownersRouter.use(verifyAccessToken);
ownersRouter.use(requireOwner);

ownersRouter.get("/notifications", getOwnerNotifications);
ownersRouter.put("/notifications/:id/read", markNotificationRead);
ownersRouter.put("/notifications/mark-all-read", markAllRead);

export default ownersRouter;