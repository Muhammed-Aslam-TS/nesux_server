import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const fixIndexes = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI not found in .env');
      process.exit(1);
    }

    // Connect to the database
    // Note: If the error says "test.categories", it means the DB name is "test"
    await mongoose.connect(mongoUri, { dbName: 'test' });
    console.log('Connected to MongoDB');

    const collections = await mongoose.connection.db.listCollections().toArray();
    const categoriesExists = collections.some(c => c.name === 'categories');

    if (!categoriesExists) {
      console.log('Collection "categories" not found. Trying pluralized "Categories"...');
      // Mongoose usually pluralizes, but let's be sure.
    }

    const categoriesColl = mongoose.connection.db.collection('categories');
    
    console.log('Listing indexes for "categories"...');
    const indexes = await categoriesColl.indexes();
    console.log(indexes);

    const nameIndexExists = indexes.some(idx => idx.name === 'name_1');
    if (nameIndexExists) {
      console.log('Dropping index "name_1"...');
      await categoriesColl.dropIndex('name_1');
      console.log('Index "name_1" dropped successfully.');
    } else {
      console.log('Index "name_1" not found.');
    }

    // Also check for any null values that might cause issues if we try to re-create a unique index later
    const nullDocs = await categoriesColl.countDocuments({ name: null });
    console.log(`Documents with name: null -> ${nullDocs}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fixIndexes();
