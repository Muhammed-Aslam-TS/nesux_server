import { Router } from "express";
import Template from "../../model/Template.js";
import Theme from "../../model/Theme.js";
import { verifyAccessToken } from "../../middlewares/JWT.js";
import { requireOwner } from "../../middlewares/authCheck.js";

const ownerTemplateRouter = Router();

// POST /api/owner/templates/:id/apply — apply template to merchant store
ownerTemplateRouter.post("/:id/apply", verifyAccessToken, requireOwner, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const template = await Template.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }

    // 1. Find the merchant's active theme or create a new one
    let activeTheme = await Theme.findOne({ ownerId, isActive: true });
    
    if (!activeTheme) {
      // Create a default theme if none exists
      activeTheme = new Theme({
        ownerId,
        name: `Theme based on ${template.name}`,
        isActive: true
      });
    }

    // 2. Deep clone template data into merchant's theme
    // We clone: pages (templates), theme (colors/fonts), header, footer
    const clonedPages = JSON.parse(JSON.stringify(template.pages));
    const clonedThemeSettings = JSON.parse(JSON.stringify(template.theme));
    const clonedHeader = JSON.parse(JSON.stringify(template.header || {}));
    const clonedFooter = JSON.parse(JSON.stringify(template.footer || {}));

    // 3. Regenerate section IDs to avoid any potential conflicts 
    // and ensure uniqueness in the merchant's store
    const generateId = () => `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    Object.keys(clonedPages).forEach(pageType => {
      if (clonedPages[pageType] && clonedPages[pageType].sections) {
        clonedPages[pageType].sections = clonedPages[pageType].sections.map(section => ({
          ...section,
          id: generateId()
        }));
      }
    });

    // 4. Update the active theme
    activeTheme.templates = clonedPages;
    
    // Map theme settings to the actual fields in Theme model
    if (clonedThemeSettings.colors) {
      activeTheme.colors = {
        ...activeTheme.colors,
        ...clonedThemeSettings.colors,
        primary: clonedThemeSettings.colors.primary,
        secondary: clonedThemeSettings.colors.secondary,
        accent: clonedThemeSettings.colors.accent,
        background: clonedThemeSettings.colors.background,
        text: clonedThemeSettings.colors.text
      };
    }
    
    if (clonedThemeSettings.fonts) {
      activeTheme.fonts = {
        ...activeTheme.fonts,
        headingFont: clonedThemeSettings.fonts.heading,
        bodyFont: clonedThemeSettings.fonts.body
      };
    }
    
    if (clonedThemeSettings.borderRadius) {
      activeTheme.layout = {
        ...activeTheme.layout,
        borderRadius: clonedThemeSettings.borderRadius,
        buttonRadius: clonedThemeSettings.borderRadius // Fallback
      };
    }

    activeTheme.header = clonedHeader;
    activeTheme.footer = clonedFooter;
    activeTheme.updatedAt = new Date();

    await activeTheme.save();

    res.json({ 
      success: true, 
      message: `Template "${template.name}" applied successfully to your store.`,
      redirect: "/owner/theme-customizer" 
    });

  } catch (error) {
    console.error("Error applying template:", error);
    res.status(500).json({ success: false, message: "Failed to apply template: " + error.message });
  }
});

export default ownerTemplateRouter;
