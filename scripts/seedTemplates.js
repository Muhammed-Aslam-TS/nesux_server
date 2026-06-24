import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Template from '../model/Template.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/nesux";

const templates = [
  {
    name: "Fashion Elite",
    description: "A high-end, minimalist design for premium clothing brands. Features large imagery and elegant typography.",
    thumbnail: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=600",
    category: "fashion",
    isFree: true,
    isActive: true,
    previewImages: [
      "https://images.unsplash.com/photo-1441984908796-90397032e93b?auto=format&fit=crop&q=80&w=1200",
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200"
    ],
    theme: {
      colors: {
        primary: "#1a1a1a",
        secondary: "#ffffff",
        accent: "#c5a059",
        background: "#ffffff",
        text: "#1a1a1a"
      },
      fonts: {
        heading: "Playfair Display",
        body: "Inter"
      },
      borderRadius: "0px",
      buttonStyle: "sharp"
    },
    pages: {
      home: {
        sections: [
          {
            id: "hero_1",
            type: "hero",
            settings: {
              title: "Summer Collection 2024",
              subtitle: "The Elite Collection",
              description: "Experience the new standard of luxury clothing.",
              backgroundImage: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=2000",
              button1Text: "Shop Collection",
              button1Link: "/collections/all",
              titleColor: "#ffffff",
              subtitleColor: "#c5a059"
            }
          },
          {
            id: "featured_1",
            type: "featuredProducts",
            settings: {
              title: "Trending Now",
              limit: 4,
              columns: 4
            }
          }
        ]
      },
      product: {
        sections: [
          { id: "pd_1", type: "productDetail", settings: {} }
        ]
      },
      collection: {
        sections: [
          { id: "ch_1", type: "collectionHeader", settings: { showImage: true } },
          { id: "pg_1", type: "productGrid", settings: { columns: 4 } }
        ]
      }
    }
  },
  {
    name: "Tech Pulse",
    description: "Modern, dark-themed layout perfect for gadgets and electronics. High-performance grid systems.",
    thumbnail: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=600",
    category: "electronics",
    isFree: true,
    isActive: true,
    previewImages: [
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=1200"
    ],
    theme: {
      colors: {
        primary: "#0071e3",
        secondary: "#1d1d1f",
        accent: "#0071e3",
        background: "#f5f5f7",
        text: "#1d1d1f"
      },
      fonts: {
        heading: "Inter",
        body: "Inter"
      },
      borderRadius: "12px",
      buttonStyle: "rounded"
    },
    pages: {
      home: {
        sections: [
          {
            id: "hero_tech",
            type: "hero",
            settings: {
              title: "Next-Gen Performance",
              subtitle: "Introducing Pulse X",
              backgroundImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2000",
              button1Text: "Buy Now"
            }
          },
          {
            id: "grid_tech",
            type: "categories",
            settings: {
              title: "Shop by Category",
              layout: "grid"
            }
          }
        ]
      }
    }
  }
];

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB...");

    await Template.deleteMany({});
    console.log("Cleared old templates.");

    await Template.insertMany(templates);
    console.log("Inserted new templates successfully!");

    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
};

seed();
