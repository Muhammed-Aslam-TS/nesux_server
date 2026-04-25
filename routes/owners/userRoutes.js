import express from "express";
import {
  deleteUserForOwner,
  getAllUsersForOwner,
  getUserByIdForOwner,
  updateUserForOwner,
} from "../../controllers/owner/userOwnerController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireOwner } from "../../middlewares/authCheck.js";
const UserOwnerRouter = express.Router();

// All routes in this file are for owners and require authentication.
// The base path is already '/api/owner/users' as defined in server.js
UserOwnerRouter.use(verifyAccessToken);
UserOwnerRouter.use(requireOwner);

UserOwnerRouter.get("/", getAllUsersForOwner);

// @route   GET /api/owner/users/:id
// @desc    Get a specific user's details
UserOwnerRouter.get("/:id", getUserByIdForOwner);

// @route   PUT /api/owner/users/:id
// @desc    Update a user's details (e.g., activate/deactivate)
UserOwnerRouter.put("/:id", updateUserForOwner);
UserOwnerRouter.patch("/block/:id", updateUserForOwner);

// @route   DELETE /api/owner/users/:id
// @desc    Delete a user
UserOwnerRouter.delete("/:id", deleteUserForOwner);

export default UserOwnerRouter;