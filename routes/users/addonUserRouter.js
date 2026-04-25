import express from "express";
import { getAddons, getAddonById } from "../../controllers/users/addonUserController.js";

const addonUserRouter = express.Router();

// Get all addons for the user's store
addonUserRouter.get("/", getAddons);
addonUserRouter.get("/:addonId", getAddonById);

export default addonUserRouter;