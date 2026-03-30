import express from "express";
import { 
  createBundle, 
  deleteBundle, 
  getAllBundles, 
  getBundleById, 
  updateBundle 
} from "../../controllers/owner/bundleController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireOwner } from "../../middlewares/authCheck.js";

const bundleRouter = express.Router();

// All routes are prefixed with /api/owner/bundles in server.js
bundleRouter.use(verifyAccessToken);
bundleRouter.use(requireOwner);

bundleRouter.get("/", getAllBundles);
bundleRouter.get("/:id", getBundleById);
bundleRouter.post("/create", createBundle);
bundleRouter.put("/:id", updateBundle);
bundleRouter.delete("/:id", deleteBundle);

export default bundleRouter;
