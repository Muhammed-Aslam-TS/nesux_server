// import {
//   addSection,
//   deleteSection,
//   getTheme,
//   resetTheme,
//   saveTheme,
//   updateSection,
//   updateSections,
// } from "../../controllers/owner/themeController.js";
// import { requireOwner } from "../../middlewares/authCheck.js";
// import { verifyAccessToken } from "../../middlewares/JWT.js";
// import express from "express";

// /**
//  * Theme Routes
//  * All routes are prefixed with /api/owner/theme
//  */
// const themeRouter = express.Router();
// themeRouter.use(verifyAccessToken);
// // themeRouter.use(requireOwner);
// // Get active theme
// themeRouter.get("/", getTheme);

// // Save/Update theme
// themeRouter.post("/", saveTheme);
// themeRouter.put("/", saveTheme);

// // Section management
// themeRouter.post("/sections", addSection);
// themeRouter.put("/sections", updateSections);
// themeRouter.put("/sections/:sectionId", updateSection);
// themeRouter.delete("/sections/:sectionId", deleteSection);

// // Reset theme
// themeRouter.post("/reset", resetTheme);

// export default themeRouter;



// routes/owner/themeRoutes.js
import express from "express";


import { 
  addSection, 
  deleteSection, 
  getTheme, 
  resetTheme, 
  saveTheme, 
  updateSection, 
  updateSections,
  getAllThemes,
  createTheme,
  activateTheme,
  deleteTheme
} from "../../controllers/owner/themeController.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireOwner } from "../../middlewares/authCheck.js";
import { tenantResolver } from "../../middlewares/tenantResolver.js";

const themeRouter = express.Router();

// This route is now public-first to serve theme info to visitors.
// It checks for a tenant by domain, then optionally for a logged-in user.
themeRouter.get("/", tenantResolver, verifyAccessToken, getTheme);

// Theme Library Management (Authenticated Owner)
themeRouter.get("/list", verifyAccessToken, requireOwner, getAllThemes);
themeRouter.post("/create", verifyAccessToken, requireOwner, createTheme);
themeRouter.put("/:themeId/activate", verifyAccessToken, requireOwner, activateTheme);
themeRouter.delete("/:themeId", verifyAccessToken, requireOwner, deleteTheme);

// Save/Update theme
// These routes require owner authentication.
themeRouter.post("/", verifyAccessToken, requireOwner, saveTheme);
themeRouter.put("/", verifyAccessToken, requireOwner, saveTheme);

// Section management
themeRouter.post("/sections", verifyAccessToken, requireOwner, addSection);
themeRouter.put("/sections", verifyAccessToken, requireOwner, updateSections);
themeRouter.put("/sections/:sectionId", verifyAccessToken, requireOwner, updateSection);
themeRouter.delete("/sections/:sectionId", verifyAccessToken, requireOwner, deleteSection);

// Reset theme
themeRouter.post("/reset", verifyAccessToken, requireOwner, resetTheme);

export default themeRouter;
