const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDatabase = require('../src/config/db');
const User = require('../src/models/User');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;;

const createAdmin = async () => {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD in backend/.env');
  }

  const name = ADMIN_NAME.trim();
  const email = ADMIN_EMAIL.trim().toLowerCase();
  if (name.length < 2 || name.length > 100 || !emailPattern.test(email)) {
    throw new Error('ADMIN_NAME or ADMIN_EMAIL is invalid');
  }
  if (ADMIN_PASSWORD.length < 8 || Buffer.byteLength(ADMIN_PASSWORD, 'utf8') > 72) {
    throw new Error('ADMIN_PASSWORD must be between 8 characters and 72 bytes');
  }

  await connectDatabase();
  if (await User.findOne({ email })) {
    throw new Error('An account with this email already exists; no account was changed');
  }

  const password = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await User.create({
    name,
    email,
    password,
    role: 'admin',
  });

  console.log('Administrator account created');
};

createAdmin()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
