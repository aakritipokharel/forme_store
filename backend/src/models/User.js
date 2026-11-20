const mongoose = require('mongoose');

const bcryptHashPattern = /^\$2[ab]\$\d{2}\$[./A-Za-z0-9]{53}$/;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
      match: [bcryptHashPattern, 'Password must be a bcrypt hash'],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [30, 'Phone number cannot exceed 30 characters'],
    },
    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (document, result) => {
        delete result.password;
        return result;
      },
    },
    toObject: {
      transform: (document, result) => {
        delete result.password;
        return result;
      },
    },
  },
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
