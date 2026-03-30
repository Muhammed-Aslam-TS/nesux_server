
import express from "express";
import { createAddress, deleteAddress, getAddresses, getAddressesCheckout, updateAddress } from "../../controllers/users/addressController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireUser } from "../../middlewares/authCheck.js";

const AddressesRouter = express.Router();

// All address routes require authentication
AddressesRouter.use(verifyAccessToken);
AddressesRouter.use(requireUser);

AddressesRouter.post("/", createAddress);
// outhRouter.post("/logIn", userLogin);

// // Get all users
AddressesRouter.get("/", getAddresses);
AddressesRouter.get("/AddressesCheckout", getAddressesCheckout);

// // Get a user by ID
// outhRouter.get("/:id", getUserById);

// // Update a user
AddressesRouter.put("/:id", updateAddress);

// // Delete a user
AddressesRouter.delete("/:id", deleteAddress);

export default AddressesRouter;
