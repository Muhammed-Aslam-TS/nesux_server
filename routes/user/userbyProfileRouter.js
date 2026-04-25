import { Router } from 'express';
import { getProfile, updateProfile } from '../../controllers/users/userProfileController.js';
import { getAddresses, createAddress } from '../../controllers/users/addressController.js';
import { verifyAccessToken } from '../../middlewares/JWT.js';
import { requireUser } from '../../middlewares/authCheck.js';

const UserbyProfile = Router();

// All user profile routes require authentication
UserbyProfile.use(verifyAccessToken);
UserbyProfile.use(requireUser);

UserbyProfile.get('/profile', getProfile);
UserbyProfile.put('/profile', updateProfile);
UserbyProfile.get('/addresses', getAddresses);
UserbyProfile.post('/addresses', createAddress);

export default UserbyProfile;