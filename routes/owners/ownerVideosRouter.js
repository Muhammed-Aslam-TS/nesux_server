import express from "express";
import {
    createVideo,
    deleteVideo,
    getVideos,
    updateVideo,
    updateVideoOrder
} from "../../controllers/owner/videoController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireOwner } from "../../middlewares/authCheck.js";

const ownerVideoRouter = express.Router();

ownerVideoRouter.use(verifyAccessToken);
ownerVideoRouter.use(requireOwner);

ownerVideoRouter.route("/")
    .get(getVideos)
    .post(createVideo);

ownerVideoRouter.route("/update-order")
    .put(updateVideoOrder);

ownerVideoRouter.route("/:id")
    .put(updateVideo)
    .delete(deleteVideo);

export default ownerVideoRouter;
