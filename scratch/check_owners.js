import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/Ecomerce';

async function checkOwners() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const Owner = mongoose.model('Owner', new mongoose.Schema({}, { strict: false }), 'owners');
    const owners = await Owner.find({});

    console.log(`Found ${owners.length} owners:`);
    owners.forEach(o => {
      console.log(`- ID: ${o._id}, Username: ${o.username}, Email: ${o.email}, Domain: ${o.primaryDomain}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkOwners();
