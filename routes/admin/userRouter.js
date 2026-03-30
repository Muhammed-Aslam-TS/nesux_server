


import { Router } from 'express';

// import { getUsers, getUsersbyId } from '../../controllers/owner/userOwnerController.js';
import { verifyAccessToken } from '../../middlewares/JWT.js';
import { requireOwnerOrAdmin } from '../../middlewares/authCheck.js';

const UserRouter = Router();

// All user routes require authentication (owner or admin)
UserRouter.use(verifyAccessToken);
UserRouter.use(requireOwnerOrAdmin);

// Get all users
// UserRouter.get('/', getUsers);


export default UserRouter;