import express from "express";
import { subscribeToFlashSale } from "../../controllers/users/notificationController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireUser } from "../../middlewares/authCheck.js";

const notificationRouter = express.Router();

notificationRouter.post("/subscribe", verifyAccessToken, requireUser, subscribeToFlashSale);

export default notificationRouter;