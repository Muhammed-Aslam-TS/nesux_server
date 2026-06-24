import mongoose from "mongoose";

const TemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  thumbnail: { type: String },
  category: { 
    type: String, 
    enum: ["fashion", "electronics", "food", "general", "minimal", "luxury"],
    default: "general"
  },
  isFree: { type: Boolean, default: true },
  price: { type: Number, default: 0 },
  
  // The core design data
  pages: {
    home: { sections: { type: Array, default: [] } },
    productDetails: { sections: { type: Array, default: [] } },
    categoryProduct: { sections: { type: Array, default: [] } },
    cart: { sections: { type: Array, default: [] } },
    products: { sections: { type: Array, default: [] } },
    categories: { sections: { type: Array, default: [] } },
  },
  
  theme: {
    colors: {
      primary: { type: String, default: "#000000" },
      secondary: { type: String, default: "#ffffff" },
      accent: { type: String, default: "#e63946" },
      background: { type: String, default: "#f8f9fa" },
      text: { type: String, default: "#212529" }
    },
    fonts: {
      heading: { type: String, default: "Inter" },
      body: { type: String, default: "Inter" }
    },
    borderRadius: { type: String, default: "4px" },
    buttonStyle: { type: String, default: "rounded" }
  },
  
  header: { type: mongoose.Schema.Types.Mixed, default: {} },
  footer: { type: mongoose.Schema.Types.Mixed, default: {} },
  
  previewImages: [{ type: String }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Template || mongoose.model("Template", TemplateSchema);
