import Product from "../../model/product.js";
import Category from "../../model/categoryModels.js";
import Banner from "../../model/bannerModel.js";
import Offer from "../../model/OfferModel.js";
import Theme from "../../model/Theme.js";
import { getOwnerId } from "../../middlewares/getOwnerId.js";
import Review from "../../model/reviewModel.js";
import Owner from "../../model/OwnerModels.js";
import VideoProduct from "../../model/VideoProduct.js";

/**
 * PUBLIC PRODUCTS
 */

// Get all public products for a store
export const getProducts = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    console.log("public/getProducts - ownerId:", ownerId);
    if (!ownerId) {
      console.log("public/getProducts - No ownerId found, returning 404");
      return res
        .status(404)
        .json({ success: false, message: "Store not found for this domain." });
    }

    const {
      page = 1,
      pageSize = 10,
      search,
      categoryId,
      priceRange,
      sort,
    } = req.query;

    const query = {
      ownerId,
      "flags.isBlocked": { $ne: true },
      isActive: { $ne: false },
      isDeleted: { $ne: true },
    };

    // Search Filter
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
      ];
    }

    // Category Filter
    if (categoryId) {
      query.category = categoryId;
    }

    // Price Range Filter
    let pr = priceRange || req.query["priceRange[]"];
    if (typeof pr === "string" && pr.includes(",")) pr = pr.split(",");

    if (pr && Array.isArray(pr) && pr.length === 2) {
      const min = Number(pr[0]);
      const max = Number(pr[1]);
      if (!isNaN(min) && !isNaN(max)) {
        query["basePrice.offerPrice"] = { $gte: min, $lte: max };
      }
    } else if (req.query.price) {
      // Fallback for simple price=X query
      query["basePrice.offerPrice"] = { $lte: Number(req.query.price) };
    }

    // Sorting
    let sortOptions = { createdAt: -1 };
    if (sort === "price_asc") sortOptions = { "basePrice.offerPrice": 1 };
    else if (sort === "price_desc")
      sortOptions = { "basePrice.offerPrice": -1 };
    else if (sort === "name_asc") sortOptions = { title: 1 };
    else if (sort === "name_desc") sortOptions = { title: -1 };
    else if (sort === "rating") sortOptions = { "ratings.average": -1 };

    // Pagination
    const limit = parseInt(pageSize, 10) || 10;
    const currentPage = parseInt(page, 10) || 1;
    const skip = (currentPage - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("category", "categoryName")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        total,
        page: currentPage,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Get a single public product by ID
export const getProductById = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    console.log("public/getProductById - ownerId:", ownerId);
    if (!ownerId) {
      return res
        .status(404)
        .json({ success: false, message: "Store not found for this domain." });
    }
    const { productId } = req.params;
    const query = {
      _id: productId,
      ownerId,
      "flags.isBlocked": { $ne: true },
      isActive: { $ne: false },
      isDeleted: { $ne: true },
    };
    const product = await Product.findOne(query)
      .populate("category", "categoryName")
      .populate("addons")
      .lean();
    if (!product) {
      console.log(
        "public/getProductById - Product NOT found in DB with query:",
        query,
      );
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }
    console.log("public/getProductById - Product found!");
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Get public trending products for a store
export const getTrendingProducts = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) {
      return res
        .status(404)
        .json({ success: false, message: "Store not found for this domain." });
    }
    const query = {
      ownerId,
      "flags.isBlocked": { $ne: true },
      "flags.isTrending": true,
      isActive: { $ne: false },
      isDeleted: { $ne: true },
    };
    const products = await Product.find(query)
      .sort({ "ratings.average": -1 })
      .limit(10)
      .lean();
    res.status(200).json({ success: true, data: products });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Get all reviews for a specific product
export const getReviewsByProductId = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) {
      return res
        .status(404)
        .json({ success: false, message: "Store not found for this domain." });
    }

    const { productId } = req.params;

    // Fetch reviews from the Review collection for the given product and owner
    const reviews = await Review.find({ productId, ownerId: ownerId })
      .populate({
        path: "userId",
        select: "username createdAt", // Select the fields you want from the User model
      })
      .sort({ createdAt: -1 }) // Sort by most recent
      .lean();

    // Disable caching for this response to prevent 304 Not Modified issues
    res.set("Cache-Control", "no-store");

    res.status(200).json({ success: true, reviews: reviews });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Search for public products and categories (for suggestions/autocomplete)
export const searchProducts = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) {
      return res
        .status(404)
        .json({ success: false, message: "Store not found for this domain." });
    }

    const { query: searchQuery } = req.query;
    if (!searchQuery) {
      return res
        .status(400)
        .json({ success: false, message: "Search query is required." });
    }

    // Create a case-insensitive regular expression for searching
    const regex = new RegExp(searchQuery, "i");

    // --- Run searches for products and categories in parallel ---
    const [products, categories] = await Promise.all([
      // Search for products
      Product.find({
        ownerId,
        "flags.isBlocked": { $ne: true },
        isActive: { $ne: false },
        isDeleted: { $ne: true },
        $or: [
          { title: { $regex: regex } },
          { description: { $regex: regex } },
          { tags: { $regex: regex } },
        ],
      })
        .select("_id title basePrice images") // Select only the fields needed for suggestions
        .limit(10) // Limit the number of results
        .lean(),

      // Search for categories
      Category.find({
        ownerId,
        categoryName: { $regex: regex },
      })
        .select("_id categoryName") // Select only the fields needed
        .limit(5) // Limit the number of category results
        .lean(),
    ]);

    // --- Format results to match the desired data structure ---
    const formattedProducts = products.map((p) => ({
      _id: p._id,
      name: p.title, // Map title to name for frontend compatibility
      price: p.basePrice?.offerPrice,
      images: p.images,
      type: "product",
    }));
    const formattedCategories = categories.map((c) => ({
      _id: c._id,
      name: c.categoryName,
      type: "category",
    }));

    // Combine and send the results
    const suggestions = [...formattedProducts, ...formattedCategories];

    res.status(200).json({ success: true, data: suggestions });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

/**
 * PUBLIC CATEGORIES
 */
export const getCategories = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) {
      return res.status(200).json({ success: true, data: [] });
    }
    const query = { ownerId };
    const categories = await Category.find(query).lean();

    res.status(200).json({ success: true, categories: categories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUBLIC BANNERS
 */
export const getBanners = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) {
      return res.status(200).json({ success: true, data: [] });
    }
    const query = { ownerId, isActive: true, section: "hero" };
    const banners = await Banner.find(query)
      .sort({ position: 1, createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: banners });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to retrieve store banners",
        error: error.message,
      });
  }
};

/**
 * PUBLIC OFFERS
 */
export const getOffers = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) {
      return res
        .status(404)
        .json({ success: false, message: "Store not found for this domain." });
    }
    const { offerTimeType } = req.query;
    const now = new Date();

    const query = {
      ownerId,
      isActive: true,
      $or: [
        // For non-flash-sale offers, check the 'expiry' field.
        // It's valid if 'expiry' doesn't exist or is in the future.
        {
          offerTimeType: { $ne: "flash_sale" },
          $or: [{ expiry: { $exists: false } }, { expiry: { $gt: now } }],
        },
        // For flash sales, check the 'endTime' field.
        // It's valid only if 'endTime' is in the future.
        {
          offerTimeType: "flash_sale",
          endTime: { $gt: now },
        },
      ],
    };

    // If a specific offer type is requested, add it to the main query
    if (offerTimeType) {
      query.offerTimeType = offerTimeType;
    }

    const offers = await Offer.find(query)
      .lean()
      .populate("categoryId", "categoryName")
      .populate("productId")
      .sort({ createdAt: -1 });

    res.json(offers);
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to retrieve offers.",
        error: err.message,
      });
  }
};

export const getTimeBasedOffer = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) {
      return res
        .status(404)
        .json({ success: false, message: "Store not found for this domain." });
    }
    const offer = await Offer.findOne({
      ownerId,
      offerTimeType: "timeBased",
      isActive: true,
      expiry: { $gt: new Date() },
    })
      .lean()
      .populate({ path: "categoryId", select: "categoryName image" })
      .populate({ path: "productId", select: "title images" })
      .sort({ createdAt: -1 });
    if (!offer) {
      return res
        .status(200)
        .json({
          success: true,
          data: null,
          message: "No active time-based offer found.",
        });
    }
    let image = offer.categoryId?.image || offer.productId?.images?.[0] || null;
    res
      .status(200)
      .json({
        success: true,
        message: "Time-based offer fetched successfully",
        data: { ...offer, image },
      });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "An internal server error occurred.",
        error: err.message,
      });
  }
};

/**
 * PUBLIC THEME
 */
export const getTheme = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Store theme not found for this domain.",
        });
    }
    const theme = await Theme.findOne({ ownerId }).lean();
    if (!theme) {
      // Return a default theme structure if none is found
      return res
        .status(200)
        .json({ success: true, data: { sections: [], settings: {} } });
    }
    res.status(200).json({ success: true, data: theme });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching theme.",
        error: error.message,
      });
  }
};

export const getPublicOwnerInfo = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);

    if (!ownerId) {
      console.warn("getPublicOwnerInfo - No owner resolved for this request");
      return res.status(200).json({
        success: true,
        message: "No owner associated with this domain",
        data: null
      });
    }

    const owner = await Owner.findById(ownerId).select("-password");

    if (!owner) {
      return res.status(200).json({
        success: true,
        message: "Owner not found in database",
        data: null
      });
    }

    res.status(200).json({
      success: true,
      message: "Owner information retrieved successfully",
      data: owner,
    });
  } catch (error) {
    console.log(error, "get owner info not found");
    res.status(500).json({
      success: false,
      message: "Error retrieving owner information",
      error: error.message,
    });
  }
};

export const fetchRelatedProducts = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) {
      return res
        .status(404)
        .json({ success: false, message: "Store not found for this domain." });
    }

    // Get productId from params or query (handle case sensitivity and duplicates)
    let productId =
      req.params.productId || req.query.productId || req.query.ProductId;

    if (Array.isArray(productId)) {
      productId = productId[0];
    }

    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: "Product ID is required." });
    }

    // 1. Find the current product to identify its category
    const product = await Product.findOne({ _id: productId, ownerId }).select(
      "category",
    );
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    // 2. Find other products in the same category
    const relatedProducts = await Product.find({
      ownerId,
      category: product.category,
      _id: { $ne: productId }, // Exclude the current product
      "flags.isBlocked": { $ne: true },
      isActive: { $ne: false },
      isDeleted: { $ne: true },
    })
      .populate("category", "categoryName")
      .limit(8) // Limit to 8 products (e.g., 2 rows of 4)
      .lean();

    res.status(200).json({ success: true, data: relatedProducts });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

export const getStoreVideos = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) {
      return res.status(200).json({ success: true, data: [] });
    }
    const videos = await VideoProduct.find({ ownerId, isActive: true })
      .populate('productId', 'title basePrice images variants productType')
      .sort({ order: 1 })
      .lean();
    res.status(200).json({ success: true, data: videos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
