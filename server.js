import dotenv from "dotenv";
dotenv.config();
import express, { json, static as expressStatic } from "express";
import cors from "cors";
import morgan from "morgan";

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import connectDB from "./config/db.js";
import { tenantMiddleware } from "./controllers/owner/tenantMiddleware.js";

// import { tenantResolver } from "./middlewares/tenantResolver.js";

import productRouter from "./routes/admin/productRouter.js";
import offerRoutes from "./routes/admin/offerRoutes.js";
import categoryRoutes from "./routes/owners/categoryRouter.js";
import couponRoutes from "./routes/admin/couponRoutes.js";
import authRouter from "./routes/user/authRouter.js";
import userRouter from "./routes/admin/userRouter.js";
import cartRouter from "./routes/user/cartRouter.js";
import ownersRoutes from "./routes/admin/ownersRoutes.js";
import ownerByReferralCodeRouter from "./routes/admin/OwnerByReferralCode.js";
import userProductRouter from "./routes/user/UserProductrouter.js";
import addressesRouter from "./routes/user/AddressesRouter.js";
import ordersRouter from "./routes/user/OrdersRouter.js";
import adminRoutes from "./routes/admin/adminRoutes.js";
import expiredOffersRoutes from "./routes/user/ExpiredOffersRoutes.js";
import categoryByUsersRoutes from "./routes/user/categoryByUserRoutes.js";
import paymentRoutes from "./routes/users/paymentRoutes.js";
import userbyProfileRouter from "./routes/user/userbyProfileRouter.js";
import ownerOrdersRouter from "./routes/owners/OwnerOrdersRouter.js";
import dashboardRouter from "./routes/admin/dashboardRouter.js";
import subscriptionsRouter from "./routes/owners/Subscriptionsrouter.js";
import shiprocketRoutes from "./routes/owners/shiprocketRoutes.js";
import ownerInfoRouter from "./routes/owners/ownerInfoRouter.js";
import ownerDashboardRouter from "./routes/owners/dashboardRouter.js";
import wishlistRoutes from "./routes/user/wishlistRoutes.js";
import themeRouter from "./routes/owners/themeRoutes.js";
import userBannerRouter from "./routes/user/bannerRouter.js";
import ownerBannerRouter from "./routes/owners/bannerRouter.js";
import publicProductRouter from "./routes/public/productRouter.js";
import publicCategoryRouter from "./routes/public/categoryRouter.js";
import publicThemeRouter from "./routes/public/themeRouter.js";
import publicBannerRouter from "./routes/public/bannerRouter.js";
import Owner from "./model/OwnerModels.js";
import addonRouter from "./routes/owners/addonRouter.js";
import publicOfferRouter from "./routes/public/offerRouter.js";
import publicShippingRouter from "./routes/public/shippingRouter.js";
import reviewRouter from "./routes/user/reviewRouter.js";
import couponUserRouter from "./routes/user/couponRouter.js";
import UserOwnerRouter from "./routes/owners/userRoutes.js";

import addonUserRouter from "./routes/users/addonUserRouter.js";
import subscriptionRouter from "./routes/admin/subscriptionRouter.js";

import domainRouter from "./routes/owners/domainRouter.js";
import ownerReviewRouter from "./routes/owners/reviewRouter.js";
import notificationRouter from "./routes/user/notificationRouter.js";

import publicBundleRouter from "./routes/public/bundleRouter.js";
import ownerBundleRouter from "./routes/owners/bundleRouter.js";
import ownerVideoRouter from "./routes/owners/ownerVideosRouter.js";
import publicVideoRouter from "./routes/public/videoRouter.js";
import ownerTestimonialRouter from "./routes/owners/testimonialRouter.js";
import publicTestimonialRouter from "./routes/public/testimonialRouter.js";
import ownerPartnerRouter from "./routes/owners/partnerRouter.js";
import publicPartnerRouter from "./routes/public/partnerRouter.js";

import cron from "node-cron";
import { processScheduledNotifications } from "./controllers/users/notificationController.js";
import cleanupExpiredOffers from "./scripts/cleanupExpiredOffers.js";
import checkSubscriptionExpirations from "./scripts/checkSubscriptions.js";
import { seedSubscriptionPlans } from "./model/subscriptionPlans.js";

// import addonRouter from "./routes/owners/addonRouter.js";


// dotenv.config();
// connectDB();

// // const allowedOrigin = [
// //   "http://localhost:5173",
// //   "http://localhost:5174",
// //   /\.test\.store(:\d+)?$/, // regex to allow any *.test.store domain
// // ];

// const allowedBaseDomains = [
//   'localhost',
//   '127.0.0.1',
//   'test.store',
//   'darkpepper.test.store',
// ];


// const app = express();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// app.use(
//   cors({
//     origin: allowedOrigin,
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     allowedHeaders: ['Content-Type', 'Authorization']
//   })
// );



// // 👇 Dynamic CORS resolver
// const corsOptions = {
//   origin: async (origin, callback) => {
//     if (!origin) return callback(null, true);

//     const url = new URL(origin);
//     const hostname = url.hostname;

//     // Allow local/dev
//     if (hostname.endsWith('.test.store') || hostname === 'localhost') {
//       return callback(null, true);
//     }

//     // Check DB if hostname belongs to any owner
//     const exists = await Owner.exists({
//       $or: [
//         { primaryDomain: hostname },
//         { storeDomains: hostname }
//       ]
//     });

//     if (exists) return callback(null, true);

//     console.warn(`🚫 CORS blocked (not registered domain): ${origin}`);
//     return callback(new Error('Not allowed by CORS'));
//   },
//   credentials: true,
// };



// app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// app.use(express.json());

// // Tenant resolver: set req.owner (resolved by request Host) and res.locals.owner
// app.use(tenantMiddleware);

// // After tenantResolver middleware
// app.use(async (req, res, next) => {
//   if (req.owner) {
//     const ownerDist = path.join(__dirname, `uploads/owner-assets/${req.owner._id}/dist`);

//     if (fs.existsSync(path.join(ownerDist, 'index.html'))) {
//       app.use(express.static(ownerDist));
//       return res.sendFile(path.join(ownerDist, 'index.html'));
//     }
//   }
//   next();
// });

// // Static files
// app.use("/uploads", expressStatic(path.join(__dirname, "uploads")));

// // Dist folder paths
// const distPaths = {
//   owner: path.join(__dirname, "./distOwner"),
//   admin: path.join(__dirname, "./distAdmin"),
//   default: path.join(__dirname, "./dist") // Default to owner app
// };

// // Check which dist folders exist and serve them
// const availableRoutes = {};

// // Check owner dist
// if (fs.existsSync(distPaths.owner) && fs.existsSync(path.join(distPaths.owner, 'index.html'))) {
//   app.use("/owner", expressStatic(distPaths.owner));
//   availableRoutes.owner = {
//     name: 'EcommerceByowner',
//     path: '/owner',
//     distPath: distPaths.owner,
//     status: '✅ Ready'
//   };
//   console.log(`📁 Serving EcommerceByowner from: ${distPaths.owner}`);
// }

// // Check admin dist
// if (fs.existsSync(distPaths.admin) && fs.existsSync(path.join(distPaths.admin, 'index.html'))) {
//   app.use("/admin", expressStatic(distPaths.admin));
//   availableRoutes.admin = {
//     name: 'EcommerceByAdmin',
//     path: '/admin',
//     distPath: distPaths.admin,
//     status: '✅ Ready'
//   };
//   console.log(`📁 Serving EcommerceByAdmin from: ${distPaths.admin}`);
// }

// // Check default dist
// if (fs.existsSync(distPaths.default) && fs.existsSync(path.join(distPaths.default, 'index.html'))) {
//   app.use("/", expressStatic(distPaths.default));
//   availableRoutes.default = {
//     name: 'Default',
//     path: '/',
//     distPath: distPaths.default,
//     status: '✅ Ready'
//   };
//   console.log(`📁 Serving Default from: ${distPaths.default}`);
// }

// // API Routes - Only basic routes for now
// app.use("/api/outhenticate", outhRouter);
// app.use("/api/shiprocket", shiprocketRoutes);

// // Admin routes (with authentication built into each route)
// app.use("/api/admin", adminRoutes);
// app.use("/api/owners", ownersRoutes);
// app.use('/api/ExpiredOffers', ExpiredOffersRoutes);
// app.use("/api/userProducts", UserProductrouter);

// // Routes for admin (with authentication built into each route)
// app.use("/api/subscriptions", Subscriptionsrouter);
// app.use("/api/products", Productrouter);
// app.use("/api/owner/info", ownerInfoRouter);
// app.use("/api/user", UserbyProfile);

// app.use("/api/coupons", couponRoutes);
// app.use("/api/cart", cartRouter);
// app.use("/api/wishlist", wishlistRoutes);
// app.use("/api/offers", offerRoutes);
// app.use("/api/categories", CategoryRoutes);
// app.use("/api/categoriesByUser", CategoryByUsersRoutes);
// app.use("/api/users", UserRouter);
// app.use("/api/getOwnerByReferralCode", OwnerByReferralCode);
// app.use("/api/getProductById", UserProductrouter);
// app.use("/api/addresses", AddressesRouter);
// app.use("/api/orders", OrdersRouter);

// app.use("/api/owner/orders", OwnerOrdersRouter);
// app.use("/api/razorpayOrder", paymentRoutes);
// app.use("/api/dashBoardDtas", dashboardRouter);
// app.use("/api/owner/dashboard", ownerDashboardRouter);

// // Handle SPA routing for each app
// app.get('/owner/*', (req, res) => {
//   if (availableRoutes.owner) {
//     res.sendFile(path.join(availableRoutes.owner.distPath, 'index.html'));
//   } else {
//     res.status(404).json({ message: 'Owner app not found' });
//   }
// });

// app.get('/admin/*', (req, res) => {
//   if (availableRoutes.admin) {
//     res.sendFile(path.join(availableRoutes.admin.distPath, 'index.html'));
//   } else {
//     res.status(404).json({ message: 'Admin app not found' });
//   }
// });

// // Simple catch-all for non-API routes
// app.get('*', (req, res) => {
//   if (!req.path.startsWith('/api/')) {
//     const defaultRoute = availableRoutes.default;
//     if (defaultRoute) {
//       res.sendFile(path.join(defaultRoute.distPath, 'index.html'));
//     } else {
//       res.status(404).json({ 
//         message: 'Frontend not found. Please build your frontend application.',
//         availableRoutes: Object.keys(availableRoutes)
//       });
//     }
//   }
// });

// // Start server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
//   console.log(`📁 Dist folder status:`);
//   Object.entries(distPaths).forEach(([key, distPath]) => {
//     const exists = fs.existsSync(distPath);
//     const indexExists = fs.existsSync(path.join(distPath, 'index.html'));
//     const status = exists && indexExists ? '✅ Ready' : exists ? '⚠️ No index.html' : '❌ Not found';
//     console.log(`   ${key}: ${status} - ${distPath}`);
//   });
//   console.log(`🌐 Available frontend routes:`);
//   Object.entries(availableRoutes).forEach(([key, route]) => {
//     console.log(`   ${route.name}: http://localhost:${PORT}${route.path}`);
//   });
//   console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
// });






const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- TRUST PROXY ---
// This setting is crucial for correctly resolving the client's hostname
// when the app is running behind a reverse proxy (like Nginx or a load balancer).
// It tells Express to trust the X-Forwarded-Host header sent by the proxy.
app.set('trust proxy', true);


// ========== MIDDLEWARES ==========
// Increase body size limit to handle large base64 images
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(morgan("dev"));

// Trace requests
app.use((req, res, next) => {
  console.log(`[Trace] ${req.method} ${req.originalUrl} - Host: ${req.get('host')}`);
  next();
});

// --- DYNAMIC CORS HANDLER ------
const domainCache = new Map();
const CACHE_TTL = 300000; // 5 minutes

const corsOptions = {
  origin: async (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    const url = new URL(origin);
    const hostname = url.hostname;

    // 1. Whitelist for development
    const allowedPatterns = [
      /^https?:\/\/localhost(:\d+)?$/,
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
      /^https?:\/\/.*\.localhost(:\d+)?$/,
      /^https?:\/\/.*\.test\.store(:\d+)?$/,
      /^https?:\/\/.*\.a(:\d+)?$/,
      /^https?:\/\/98\.130\.142\.128(:\d+)?$/,
      /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/
    ];
    
    if (allowedPatterns.some((pattern) => pattern.test(origin))) {
      return callback(null, true);
    }

    // 2. Check Cache
    const cached = domainCache.get(hostname);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      if (cached.allowed) return callback(null, true);
      else return callback(new Error("Not allowed by CORS"));
    }

    // 3. Platform domain check
    const BASE_DOMAIN = process.env.BASE_DOMAIN || "tasel.in";
    if (hostname === BASE_DOMAIN || hostname === `www.${BASE_DOMAIN}`) {
      domainCache.set(hostname, { allowed: true, timestamp: Date.now() });
      return callback(null, true);
    }

    // 4. Database check
    try {
      const queries = [{ primaryDomain: hostname }, { storeDomains: hostname }];
      if (hostname.endsWith(`.${BASE_DOMAIN}`)) {
        const username = hostname.slice(0, -(`.${BASE_DOMAIN}`.length));
        if (username) queries.push({ username });
      }

      const ownerExists = await Owner.exists({ $or: queries });

      domainCache.set(hostname, { allowed: !!ownerExists, timestamp: Date.now() });

      if (ownerExists) {
        return callback(null, true);
      } else {
        console.error(`❌ Blocked by CORS: The domain "${hostname}" is not registered.`);
        return callback(new Error("Not allowed by CORS"));
      }
    } catch (err) {
      console.error("CORS check error:", err);
      // Fallback: allow but don't cache on error to be safe or fail closed? 
      // Let's allow and not cache so we can retry DB later.
      return callback(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Length", "X-Kuma-Revision", "x-owner-resolved"],
};


app.use(cors(corsOptions));

// ========== TENANT RESOLVER (GLOBAL) ==========
// This middleware runs for EVERY request. It inspects the hostname and attaches
// the corresponding owner to `req.owner` if a match is found in the database.
app.use(tenantMiddleware);

// ========== CONNECT DATABASE & START SERVER ==========
connectDB().then(() => {
  seedSubscriptionPlans();
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Dist folder status:`);
    Object.entries(distPaths).forEach(([key, distPath]) => {
      const exists = fs.existsSync(distPath);
      const indexExists = fs.existsSync(path.join(distPath, 'index.html'));
      const status = exists && indexExists ? '✅ Ready' : exists ? '⚠️ No index.html' : '❌ Not found';
      console.log(`   ${key}: ${status} - ${distPath}`);
    });
    console.log(`🌐 Available frontend routes:`);
    Object.entries(availableRoutes).forEach(([key, route]) => {
      console.log(`   ${route.name}: http://localhost:${PORT}${route.path}`);
    });
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  });
}).catch(err => {
  console.error("Failed to start server due to DB connection error:", err);
  process.exit(1);
});

// ========== PUBLIC ROUTES (RESOLVED BY DOMAIN) ==========
app.use("/api/public/products", publicProductRouter);
app.use("/api/public/categories", publicCategoryRouter);
app.use("/api/public/theme", publicThemeRouter);
app.use("/api/public/banners", publicBannerRouter);
app.use("/api/public/offers", publicOfferRouter);
app.use("/api/public/shipping", publicShippingRouter);
app.use("/api/public/bundles", publicBundleRouter);
app.use("/api/public/videos", publicVideoRouter);
app.use("/api/public/testimonials", publicTestimonialRouter);
app.use("/api/public/partners", publicPartnerRouter);

// ========== AUTHENTICATION & PUBLIC ROUTES ==========
app.use("/api/auth", authRouter); // For user login/registration
app.use("/api/outhenticate", authRouter); // Deprecated: Fix for backward compatibility
app.use("/api/admin", adminRoutes);
app.use("/api/owners", ownersRoutes);

// ========== USER-SPECIFIC ROUTES (REQUIRE USER LOGIN) ==========
app.use("/api/user", userbyProfileRouter); // For Users
app.use("/api/cart", cartRouter); // For Users
app.use("/api/wishlist", wishlistRoutes); // For Users
app.use("/api/addresses", addressesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/banners", userBannerRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/coupon", couponUserRouter);
app.use("/api/getaddon", addonUserRouter);
app.use("/api/notifications", notificationRouter);


// ========== OWNER-SPECIFIC ROUTES (REQUIRE OWNER LOGIN) ==========
app.use("/api/owner/subscriptions", subscriptionsRouter); // For Owners
app.use("/api/products", productRouter); // For Admin (includes reviews)
app.use("/api/owner/info", ownerInfoRouter); // For Owners
app.use("/api/owner/orders", ownerOrdersRouter);
app.use("/api/owner/dashboard", ownerDashboardRouter);
app.use("/api/owner/theme", themeRouter);
app.use("/api/owner/banners", ownerBannerRouter);
app.use("/api/owner/addons", addonRouter);
app.use("/api/owner/users", UserOwnerRouter);
app.use("/api/owner/custom-hostname", domainRouter);
app.use("/api/owner/reviews", ownerReviewRouter);
app.use("/api/owner/bundles", ownerBundleRouter);
app.use("/api/owner/videos", ownerVideoRouter);
app.use("/api/owner/testimonials", ownerTestimonialRouter);
app.use("/api/owner/partners", ownerPartnerRouter);
app.use("/api/shiprocket", shiprocketRoutes);

// ========== ADMIN-SPECIFIC ROUTES (REQUIRE ADMIN LOGIN) ==========
app.use("/api/coupons", couponRoutes); // For Admin
app.use("/api/offers", offerRoutes); // For Admin
app.use("/api/categories", categoryRoutes); // For Admin
app.use("/api/users", userRouter); // For Admin
app.use("/api/getOwnerByReferralCode", ownerByReferralCodeRouter); // For Admin
app.use('/api/ExpiredOffers', expiredOffersRoutes);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/payment", paymentRoutes);
app.use("/api/subscriptionfromAdmin", subscriptionRouter);

// ========== API 404 HANDLER ==========
// Handle 404 for API routes specifically
app.all("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// ========== STATIC FILE SERVING ==========

// Serve uploads or public files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Dist folder paths
const distPaths = {
  admin: path.join(__dirname, "adminDist"),
  default: path.join(__dirname, "dist")
};

// Fallback: Check if 'distAdmin' exists if 'adminDist' is missing
if (!fs.existsSync(distPaths.admin) && fs.existsSync(path.join(__dirname, "distAdmin"))) {
  distPaths.admin = path.join(__dirname, "distAdmin");
}

// Check which dist folders exist and serve them
const availableRoutes = {};

// Check admin dist
if (fs.existsSync(distPaths.admin) && fs.existsSync(path.join(distPaths.admin, 'index.html'))) {
  app.use("/admin", express.static(distPaths.admin));

  // Serve admin assets from root /assets as well to handle absolute path requests
  if (fs.existsSync(path.join(distPaths.admin, "assets"))) {
    app.use("/assets", express.static(path.join(distPaths.admin, "assets")));
  }

  availableRoutes.admin = {
    name: 'EcommerceByAdmin',
    path: '/admin',
    distPath: distPaths.admin,
    status: '✅ Ready'
  };
}

// Check default dist
if (fs.existsSync(distPaths.default) && fs.existsSync(path.join(distPaths.default, 'index.html'))) {
  app.use("/", express.static(distPaths.default));
  availableRoutes.default = {
    name: 'Default',
    path: '/',
    distPath: distPaths.default,
    status: '✅ Ready'
  };
}

// Handle SPA routing for each app

app.get(['/admin', '/admin/*'], (req, res) => {
  if (availableRoutes.admin) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(availableRoutes.admin.distPath, 'index.html'));
  } else {
    res.status(404).json({ message: 'Admin app not found' });
  }
});

// ========== CRON JOBS ==========
// Run every minute to check for scheduled notifications
cron.schedule('* * * * *', () => {
  processScheduledNotifications();
});

// Run every hour to clean up expired flash sales
cron.schedule('0 * * * *', () => {
  cleanupExpiredOffers();
});

// Run daily at midnight to check for expired subscriptions
cron.schedule('0 0 * * *', () => {
  checkSubscriptionExpirations();
});
// Simple catch-all for non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    const defaultRoute = availableRoutes.default;
    if (defaultRoute) {
      res.sendFile(path.join(defaultRoute.distPath, 'index.html'));
    } else {
      res.status(404).json({ 
        message: 'Frontend not found. Please build your frontend application.',
        availableRoutes: Object.keys(availableRoutes)
      });
    }
  }
});

// ========== GLOBAL ERROR HANDLER ==========
// This must be the LAST middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  res.status(statusCode).json({
    success: false,
    message: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    errors: err.errors || []
  });
});




// server startup moved inside connectDB().then() block



// created by aslam...