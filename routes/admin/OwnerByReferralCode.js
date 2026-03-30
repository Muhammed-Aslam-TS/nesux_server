


import { Router } from 'express';
import { getOwnerByReferralCode } from '../../controllers/owner/ownerController.js';
import { verifyAccessToken } from '../../middlewares/JWT.js';
import { requireUserOrOwner } from '../../middlewares/authCheck.js';

const OwnerByReferralCode = Router();

// All referral code routes require authentication (user or owner)
OwnerByReferralCode.use(verifyAccessToken);
OwnerByReferralCode.use(requireUserOrOwner);

// Get owner by referral code
OwnerByReferralCode.get("/", getOwnerByReferralCode);

export default OwnerByReferralCode;