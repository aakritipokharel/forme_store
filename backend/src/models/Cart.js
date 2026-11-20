const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Cart item product is required'],
    },
    size: {
      type: String,
      required: [true, 'Selected size is required'],
      trim: true,
    },
    color: {
      type: String,
      required: [true, 'Selected color is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Cart item quantity is required'],
      min: [1, 'Cart item quantity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Cart item quantity must be a whole number',
      },
    },
  },
  { _id: true },
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Cart owner is required'],
      unique: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Cart || mongoose.model('Cart', cartSchema);
