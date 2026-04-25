// const express = require('express');
// const dashboardRouter = express.Router();
// const { getDashboardStats } = require('../../controllers/owner/dashboardController');
// const { requireOwnerOrAdmin } = require('../../middleware/auth');

// // All routes in this file are protected
// roudashboardRouterter.use(requireOwnerOrAdmin);

// // @route   GET /api/owner/dashboard/stats
// dashboardRouter.get('/stats', getDashboardStats);

// module.exports = dashboardRouter;




import { Router } from 'express';
import { getDashboardStats, getRecentOrders, getOrderOverview, getUsageTrends } from '../../controllers/owner/dashboardController.js';
import { verifyAccessToken } from '../../middlewares/JWT.js';
import { requireOwnerOrAdmin } from '../../middlewares/authCheck.js';

const dashboardRouter = Router();

// Dashboard routes require either owner or admin authentication
dashboardRouter.use(verifyAccessToken);
dashboardRouter.use(requireOwnerOrAdmin);

// Get dashboard statistics
dashboardRouter.get("/stats", getDashboardStats);

// Get recent orders
dashboardRouter.get("/recent-orders", getRecentOrders);

// Get order overview with line graph
dashboardRouter.get("/overview", getOrderOverview);

// Get usage trends with bar graph and heatmap
dashboardRouter.get("/usage-trends", getUsageTrends);

export default dashboardRouter; 
