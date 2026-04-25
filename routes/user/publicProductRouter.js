import express from "express";
import { 
  getPublicProductById, 
  getPublicProductReviews, 
  getPublicProducts,
  getRelatedProducts,
  getPublicFlashSaleProducts
} from "../../controllers/owner/productController.js";
import { tenantResolver } from "../../middlewares/tenantResolver.js";

const publicProductRouter = express.Router();

// Apply tenant resolver to all routes
publicProductRouter.use(tenantResolver);

publicProductRouter.get("/", getPublicProducts);
publicProductRouter.get("/flash-sales", getPublicFlashSaleProducts);
publicProductRouter.get("/RelatedProducts", getRelatedProducts);
publicProductRouter.get("/:productId", getPublicProductById);
publicProductRouter.get("/reviews/:productId", getPublicProductReviews);

export default publicProductRouter;