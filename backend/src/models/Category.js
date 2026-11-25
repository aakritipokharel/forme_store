const mongoose = require('mongoose');

const isAllowedImage = (value) => {
  if (!value) {
    return true;
  }
  if (value.startsWith('/') && !value.startsWith('//')) {
    return true;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    normalizedName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    image: {
      type: String,
      default: '',
      trim: true,
      validate: {
        validator: isAllowedImage,
        message: 'Category image must be an HTTP(S) URL or a local public path',
      },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Category || mongoose.model('Category', categorySchema);
