const mongoose = require('mongoose');
const { PRODUCT_GENDERS } = require('../constants/product');

const isAllowedImagePath = (value) => value.startsWith('/') && !value.startsWith('//');
const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [150, 'Product name cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
      maxlength: [5000, 'Product description cannot exceed 5000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Product price cannot be negative'],
      validate: {
        validator: Number.isFinite,
        message: 'Product price must be a finite number',
      },
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
      maxlength: [100, 'Product category cannot exceed 100 characters'],
    },
    gender: {
      type: String,
      enum: PRODUCT_GENDERS,
    },
    image: {
      type: String,
      required: [true, 'Product image is required'],
      trim: true,
      validate: {
        validator: (value) => isHttpUrl(value) || isAllowedImagePath(value),
        message: 'Image must be an HTTP(S) URL or a local public path',
      },
    },
    sizes: {
      type: [{ type: String, trim: true }],
      default: [],
      validate: [
        {
          validator: (values) => values.every(Boolean),
          message: 'Available sizes cannot contain empty values',
        },
        {
          validator: (values) => new Set(values).size === values.length,
          message: 'Available sizes must be unique',
        },
      ],
    },
    colors: {
      type: [{ type: String, trim: true }],
      default: [],
      validate: [
        {
          validator: (values) => values.every(Boolean),
          message: 'Available colors cannot contain empty values',
        },
        {
          validator: (values) => new Set(values).size === values.length,
          message: 'Available colors must be unique',
        },
      ],
    },
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock quantity cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Stock quantity must be a whole number',
      },
    },
    featured: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
