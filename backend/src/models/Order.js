const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Ordered product reference is required'],
    },
    productName: {
      type: String,
      required: [true, 'Product name snapshot is required'],
      trim: true,
    },
    image: {
      type: String,
      required: [true, 'Product image snapshot is required'],
      trim: true,
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
    unitPrice: {
      type: Number,
      required: [true, 'Purchase-time unit price is required'],
      min: [0, 'Unit price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: [true, 'Ordered quantity is required'],
      min: [1, 'Ordered quantity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Ordered quantity must be a whole number',
      },
    },
  },
  { _id: true },
);

const deliverySchema = new mongoose.Schema(
  {
    recipientName: {
      type: String,
      required: [true, 'Delivery recipient name is required'],
      trim: true,
      maxlength: [100, 'Recipient name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Delivery phone number is required'],
      trim: true,
      maxlength: [30, 'Phone number cannot exceed 30 characters'],
    },
    address: {
      type: String,
      required: [true, 'Delivery address is required'],
      trim: true,
      maxlength: [1000, 'Delivery address cannot exceed 1000 characters'],
    },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Order customer is required'],
    },
    items: {
      type: [orderItemSchema],
      required: [true, 'At least one order item is required'],
      validate: {
        validator: (items) => items.length > 0,
        message: 'An order must contain at least one item',
      },
    },
    subtotal: {
      type: Number,
      required: [true, 'Order subtotal is required'],
      min: [0, 'Order subtotal cannot be negative'],
    },
    total: {
      type: Number,
      required: [true, 'Order total is required'],
      min: [0, 'Order total cannot be negative'],
    },
    delivery: {
      type: deliverySchema,
      required: [true, 'Delivery details are required'],
    },
    paymentMethod: {
      type: String,
      enum: ['COD'],
      default: 'COD',
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Pending',
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
