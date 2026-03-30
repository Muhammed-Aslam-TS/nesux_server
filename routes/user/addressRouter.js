import express from "express";
import { createAddress, deleteAddress, getAddresses, updateAddress } from "../../controllers/users/addressController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireUser } from "../../middlewares/authCheck.js";

const addressRouter = express.Router();

addressRouter.use(verifyAccessToken);
addressRouter.use(requireUser);

addressRouter.post("/", createAddress);
addressRouter.get("/", getAddresses);
addressRouter.put("/:id", updateAddress);
addressRouter.delete("/:id", deleteAddress);

export default addressRouter;