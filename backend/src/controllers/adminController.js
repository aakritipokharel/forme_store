const mongoose = require('mongoose');
const Activity = require('../models/Activity');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { PRODUCT_GENDERS } = require('../constants/product');

const httpError = (status, message) => Object.assign(new Error(message), { status });
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const productFields = new Set([
  'name',
  'description',
  'price',
  'category',
  'gender',
  'image',
  'sizes',
  'colors',
  'stock',
  'featured',
  'active',
]);

const normalizeProduct = (body, partial = false) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw httpError(400, 'Product details are required');
  }
  for (const field of Object.keys(body)) {
    if (!productFields.has(field)) {
      throw httpError(400, `Unsupported product field: ${field}`);
    }
  }
  const product = {};
  const textFields = [
    ['name', 150],
    ['description', 5000],
    ['category', 100],
    ['image', 2000],
  ];
  for (const [field, maxLength] of textFields) {
    if (body[field] === undefined && partial) {
      continue;
    }
    if (typeof body[field] !== 'string' || !body[field].trim() || body[field].trim().length > maxLength) {
      throw httpError(400, `${field} is required and must be no more than ${maxLength} characters`);
    }
    product[field] = body[field].trim();
  }
  if (body.gender !== undefined || !partial) {
    if (typeof body.gender !== 'string' || !PRODUCT_GENDERS.includes(body.gender)) {
      throw httpError(400, 'Collection must be men, women, or unisex');
    }
    product.gender = body.gender;
  }
  if (body.price !== undefined || !partial) {
    if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0) {
      throw httpError(400, 'Price must be a non-negative number');
    }
    product.price = body.price;
  }
  if (body.stock !== undefined || !partial) {
    if (!Number.isSafeInteger(body.stock) || body.stock < 0) {
      throw httpError(400, 'Stock must be a non-negative whole number');
    }
    product.stock = body.stock;
  }
  for (const field of ['sizes', 'colors']) {
    if (body[field] === undefined && partial) {
      continue;
    }
    if (
      !Array.isArray(body[field])
      || body[field].length > 50
      || body[field].some((value) => typeof value !== 'string' || !value.trim() || value.trim().length > 50)
    ) {
      throw httpError(400, `${field} must be a list of non-empty text values`);
    }
    const values = body[field].map((value) => value.trim());
    if (new Set(values.map((value) => value.toLowerCase())).size !== values.length) {
      throw httpError(400, `${field} cannot contain duplicates`);
    }
    product[field] = values;
  }
  for (const field of ['featured', 'active']) {
    if (body[field] === undefined && partial) {
      continue;
    }
    if (typeof body[field] !== 'boolean') {
      throw httpError(400, `${field} must be true or false`);
    }
    product[field] = body[field];
  }
  return product;
};

const recordActivity = (actor, action, targetType, targetId, description) => Activity.create({
  actor: actor._id,
  actorName: actor.name,
  action,
  targetType,
  targetId,
  description,
});

const ensureCategory = async (name) => {
  const normalizedName = name.toLowerCase();
  await Category.updateOne(
    { normalizedName },
    { $setOnInsert: { name, normalizedName } },
    { upsert: true },
  );
};

const getDashboard = async (request, response) => {
  const [
    totalProducts,
    totalCustomers,
    totalOrders,
    deliveredRevenue,
    pendingOrders,
    recentOrders,
    lowStockProducts,
    recentActivity,
  ] = await Promise.all([
    Product.countDocuments({}),
    User.countDocuments({ role: 'customer' }),
    Order.countDocuments({}),
    Order.aggregate([
      { $match: { status: 'Delivered' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Order.countDocuments({ status: 'Pending' }),
    Order.find().sort({ createdAt: -1 }).limit(6).populate('user', 'name email'),
    Product.find({ active: true, stock: { $lte: 5 } }).sort({ stock: 1, name: 1 }).limit(8),
    Activity.find().sort({ createdAt: -1 }).limit(8).populate('actor', 'name'),
  ]);
  return response.status(200).json({
    success: true,
    data: {
      statistics: {
        totalProducts,
        totalCustomers,
        totalOrders,
        totalRevenue: deliveredRevenue[0]?.total || 0,
        pendingOrders,
        lowStockProducts: lowStockProducts.length,
      },
      recentOrders,
      lowStockProducts,
      recentActivity,
    },
  });
};

const getAdminProducts = async (request, response) => {
  const { search, category, gender } = request.query;
  if (
    (search !== undefined && typeof search !== 'string')
    || (category !== undefined && typeof category !== 'string')
    || (
      gender !== undefined
      && (
        typeof gender !== 'string'
        || (gender !== 'unassigned' && !PRODUCT_GENDERS.includes(gender))
      )
    )
    || search?.length > 100
    || category?.length > 100
  ) {
    throw httpError(400, 'Search, category, or collection filter is invalid');
  }
  const filter = {};
  if (search?.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: pattern }, { description: pattern }];
  }
  if (category?.trim()) {
    filter.category = new RegExp(`^${escapeRegex(category.trim())}$`, 'i');
  }
  if (gender === 'unassigned') {
    filter.gender = null;
  } else if (gender) {
    filter.gender = gender;
  }
  const products = await Product.find(filter).sort({ createdAt: -1 });
  return response.status(200).json({ success: true, data: { products } });
};

const getAdminProduct = async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    throw httpError(404, 'Product not found');
  }
  const product = await Product.findById(request.params.id);
  if (!product) {
    throw httpError(404, 'Product not found');
  }
  return response.status(200).json({ success: true, data: { product } });
};

const createProduct = async (request, response) => {
  const productData = normalizeProduct(request.body);
  await ensureCategory(productData.category);
  const product = await Product.create(productData);
  await recordActivity(
    request.user,
    'PRODUCT_CREATED',
    'Product',
    product._id,
    `Created product ${product.name}`,
  );
  return response.status(201).json({ success: true, data: { product } });
};

const updateProduct = async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    throw httpError(404, 'Product not found');
  }
  const productData = normalizeProduct(request.body, true);
  const product = await Product.findById(request.params.id);
  if (!product) {
    throw httpError(404, 'Product not found');
  }
  if (productData.category) {
    await ensureCategory(productData.category);
  }
  Object.assign(product, productData);
  await product.save();
  await recordActivity(
    request.user,
    'PRODUCT_UPDATED',
    'Product',
    product._id,
    `Updated product ${product.name}`,
  );
  return response.status(200).json({ success: true, data: { product } });
};

const deleteProduct = async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    throw httpError(404, 'Product not found');
  }
  const product = await Product.findById(request.params.id);
  if (!product) {
    throw httpError(404, 'Product not found');
  }
  await product.deleteOne();
  await recordActivity(
    request.user,
    'PRODUCT_DELETED',
    'Product',
    product._id,
    `Deleted product ${product.name}`,
  );
  return response.status(200).json({ success: true, message: 'Product deleted' });
};

const getAdminCustomers = async (request, response) => {
  const { search } = request.query;
  if (search !== undefined && (typeof search !== 'string' || search.length > 100)) {
    throw httpError(400, 'Customer search must be text no longer than 100 characters');
  }
  const filter = { role: 'customer' };
  if (search?.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
  }
  const customers = await User.find(filter)
    .select('name email phone createdAt')
    .sort({ createdAt: -1 });
  return response.status(200).json({ success: true, data: { customers } });
};

const getAdminCustomer = async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    throw httpError(404, 'Customer not found');
  }
  const customer = await User.findOne({ _id: request.params.id, role: 'customer' })
    .select('name email phone createdAt');
  if (!customer) {
    throw httpError(404, 'Customer not found');
  }
  return response.status(200).json({ success: true, data: { customer } });
};

const getCustomerOrders = async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    throw httpError(404, 'Customer not found');
  }
  const customer = await User.exists({ _id: request.params.id, role: 'customer' });
  if (!customer) {
    throw httpError(404, 'Customer not found');
  }
  const orders = await Order.find({ user: request.params.id }).sort({ createdAt: -1 });
  return response.status(200).json({ success: true, data: { orders } });
};

const getAdminActivity = async (request, response) => {
  const activity = await Activity.find()
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('actor', 'name email');
  return response.status(200).json({ success: true, data: { activity } });
};

module.exports = {
  createProduct,
  deleteProduct,
  getAdminActivity,
  getAdminCustomer,
  getAdminCustomers,
  getAdminProduct,
  getAdminProducts,
  getCustomerOrders,
  getDashboard,
  recordActivity,
  updateProduct,
};
