const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const safeUser = require('../utils/safeUser');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const minimumPasswordLength = 8;
const maximumPasswordBytes = 72;

const register = async (request, response) => {
  const { name, email, password } = request.body || {};

  if (
    typeof name !== 'string'
    || typeof email !== 'string'
    || typeof password !== 'string'
    || !name.trim()
    || !email.trim()
    || !password.trim()
  ) {
    return response.status(400).json({
      success: false,
      message: 'Name, email, and password are required',
    });
  }

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedName.length < 2 || normalizedName.length > 100) {
    return response.status(400).json({
      success: false,
      message: 'Name must be between 2 and 100 characters',
    });
  }

  if (!emailPattern.test(normalizedEmail)) {
    return response.status(400).json({
      success: false,
      message: 'Enter a valid email address',
    });
  }

  if (password.length < minimumPasswordLength) {
    return response.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters long',
    });
  }

  if (Buffer.byteLength(password, 'utf8') > maximumPasswordBytes) {
    return response.status(400).json({
      success: false,
      message: 'Password cannot exceed 72 bytes',
    });
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return response.status(409).json({
      success: false,
      message: 'An account with this email already exists',
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name: normalizedName,
    email: normalizedEmail,
    password: passwordHash,
    role: 'customer',
  });

  return response.status(201).json({
    success: true,
    message: 'Account created. You can now log in.',
    data: {
      user: safeUser(user),
    },
  });
};

const login = async (request, response) => {
  const { email, password } = request.body || {};
  if (
    typeof email !== 'string'
    || typeof password !== 'string'
    || !email.trim()
    || !password
  ) {
    return response.status(400).json({
      success: false,
      message: 'Email and password are required',
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!emailPattern.test(normalizedEmail)) {
    return response.status(400).json({
      success: false,
      message: 'Enter a valid email address',
    });
  }

  const user = await User.findOne({ email: normalizedEmail }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return response.status(401).json({
      success: false,
      message: 'Email or password is incorrect',
    });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const token = jwt.sign(
    { sub: String(user._id), role: user.role },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' },
  );

  return response.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: safeUser(user),
    },
  });
};

const getProfile = (request, response) => response.status(200).json({
  success: true,
  data: {
    user: safeUser(request.user),
  },
});

module.exports = {
  register,
  login,
  getProfile,
};
