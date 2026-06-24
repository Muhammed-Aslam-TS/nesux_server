import { Router } from "express";
import Template from "../../model/Template.js";

const publicTemplateRouter = Router();

// GET /api/templates — list all templates
publicTemplateRouter.get("/", async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category && category !== 'all' ? { category, isActive: true } : { isActive: true };
    
    // Exclude heavy pages data in the list view
    const templates = await Template.find(filter).select('-pages').sort({ createdAt: -1 });
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ success: false, message: "Failed to fetch templates" });
  }
});

// GET /api/templates/:id — get full template (for preview)
publicTemplateRouter.get("/:id", async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }
    res.json({ success: true, data: template });
  } catch (error) {
    console.error("Error fetching template detail:", error);
    res.status(500).json({ success: false, message: "Failed to fetch template details" });
  }
});

export default publicTemplateRouter;
