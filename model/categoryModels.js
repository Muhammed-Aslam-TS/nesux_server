import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  categoryName: {
    type: String,
    required: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    
  },
  image: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: false, // Optional field
  },
  isTrending: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true
});

// Index for efficient querying and uniqueness per owner
categorySchema.index({ ownerId: 1, categoryName: 1 }, { unique: true });

// Create the Category model
const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

export default Category;
