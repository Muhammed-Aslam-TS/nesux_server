import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../model/categoryModels.js';

dotenv.config();

const verifyFix = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    await mongoose.connect(mongoUri, { dbName: 'test' });
    console.log('Connected to MongoDB');

    // Clear test categories if they exist
    const owner1 = new mongoose.Types.ObjectId();
    const owner2 = new mongoose.Types.ObjectId();

    console.log('Test 1: Creating a category for Owner 1');
    const cat1 = await Category.create({
      categoryName: 'Electronics',
      ownerId: owner1,
      image: 'test.jpg'
    });
    console.log('✅ Created cat1:', cat1._id);

    console.log('Test 2: Creating a category with same name for Owner 2 (Should SUCCEED now)');
    const cat2 = await Category.create({
      categoryName: 'Electronics',
      ownerId: owner2,
      image: 'test.jpg'
    });
    console.log('✅ Created cat2:', cat2._id);

    console.log('Test 3: Creating a category with same name for Owner 1 (Should FAIL due to unique index)');
    try {
      await Category.create({
        categoryName: 'Electronics',
        ownerId: owner1,
        image: 'test.jpg'
      });
      console.error('❌ Test 3 failed: Should have thrown duplicate key error');
    } catch (err) {
      if (err.code === 11000) {
        console.log('✅ Test 3 passed: Correctly caught duplicate key error for same owner');
      } else {
        console.error('❌ Test 3 failed with unexpected error:', err);
      }
    }

    // Cleanup
    await Category.deleteOne({ _id: cat1._id });
    await Category.deleteOne({ _id: cat2._id });
    console.log('Cleanup done');

    process.exit(0);
  } catch (error) {
    console.error('Verification Error:', error);
    process.exit(1);
  }
};

verifyFix();
