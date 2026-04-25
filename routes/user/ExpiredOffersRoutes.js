







import express from 'express';
import { resetExpiredOffers } from '../../controllers/owner/offerControlles.js';
import { verifyAccessToken } from '../../middlewares/JWT.js';
import { tenantResolver } from '../../middlewares/tenantResolver.js';

const ExpiredOffersRoutes = express.Router(); 

// This endpoint is now public-safe.
// It uses tenantResolver to identify the store and verifyAccessToken to optionally get user info.
ExpiredOffersRoutes.put('/', tenantResolver, verifyAccessToken, resetExpiredOffers);


export default ExpiredOffersRoutes;
