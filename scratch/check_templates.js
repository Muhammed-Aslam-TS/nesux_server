import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const TemplateSchema = new mongoose.Schema({
  name: String,
  category: String,
  isActive: Boolean
}, { strict: false });

const Template = mongoose.model('Template', TemplateSchema);

async function checkTemplates() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to MongoDB");
    
    const count = await Template.countDocuments();
    console.log(`Total templates in DB: ${count}`);
    
    const activeCount = await Template.countDocuments({ isActive: true });
    console.log(`Active templates in DB: ${activeCount}`);
    
    const templates = await Template.find().limit(5).select('name category isActive');
    console.log("Sample templates:");
    console.log(JSON.stringify(templates, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkTemplates();
