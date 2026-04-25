import express from "express";
import {
  createUser,
  deleteUser,
  getAllUsers,
  getUserById,
  updateUser,
  userLogin,
  sendOtp,
  verifyOtp,
  createGuestSession
} from "../../controllers/users/authController.js";


const authRouter = express.Router();

authRouter.post("/", createUser);
authRouter.post("/logIn", userLogin);
authRouter.post("/guest-login", createGuestSession);

// Get all users
authRouter.get("/", getAllUsers);

// Get a user by ID


// Update a user
authRouter.put("/:id", updateUser);

// Delete a user
authRouter.delete("/:id", deleteUser);

authRouter.post("/send-otp", sendOtp);
authRouter.post("/verify-otp", verifyOtp);

export default authRouter;
