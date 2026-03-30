import express, { json, static as expressStatic } from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";

dotenv.config();
connectDB();

const allowedOrigin = ["http://localhost:5173", "http://localhost:5174"];
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  cors({
    origin: allowedOrigin,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json());

// Static files
app.use("/uploads", expressStatic(path.join(__dirname, "uploads")));

// Dist folder paths
const distPaths = {
  owner: path.join(__dirname, "../EcommerceByowner/dist"),
  admin: path.join(__dirname, "../EcommerceByAdmin/dist"),
  default: path.join(__dirname, "../dist")
};

// Check which dist folders exist and serve them
const fs = await import('fs');
const availableRoutes = {};

// Check owner dist
if (fs.existsSync(distPaths.owner) && fs.existsSync(path.join(distPaths.owner, 'index.html'))) {
  app.use("/owner", expressStatic(distPaths.owner));
  availableRoutes.owner = {
    name: 'EcommerceByowner',
    path: '/owner',
    distPath: distPaths.owner,
    status: '✅ Ready'
  };
  console.log(`📁 Serving EcommerceByowner from: ${distPaths.owner}`);
}

// Check admin dist
if (fs.existsSync(distPaths.admin) && fs.existsSync(path.join(distPaths.admin, 'index.html'))) {
  app.use("/admin", expressStatic(distPaths.admin));
  availableRoutes.admin = {
    name: 'EcommerceByAdmin',
    path: '/admin',
    distPath: distPaths.admin,
    status: '✅ Ready'
  };
  console.log(`📁 Serving EcommerceByAdmin from: ${distPaths.admin}`);
}

// Check default dist
if (fs.existsSync(distPaths.default) && fs.existsSync(path.join(distPaths.default, 'index.html'))) {
  app.use("/", expressStatic(distPaths.default));
  availableRoutes.default = {
    name: 'Default',
    path: '/',
    distPath: distPaths.default,
    status: '✅ Ready'
  };
  console.log(`📁 Serving Default from: ${distPaths.default}`);
}

// Basic test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
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

// Start server
const PORT = process.env.PORT || 5000;
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