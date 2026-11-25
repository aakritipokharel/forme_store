const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { recordActivity } = require('./adminController');

const httpError = (status, message) => Object.assign(new Error(message), { status });
const categoryFields = new Set(['name', 'image']);

const normalizeCategory = (body, partial = false) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw httpError(400, 'Category details are required');
  }
  for (const field of Object.keys(body)) {
    if (!categoryFields.has(field)) {
      throw httpError(400, `Unsupported category field: ${field}`);
    }
  }
  const result = {};
  if (body.name !== undefined || !partial) {
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 100) {
      throw httpError(400, 'Category name is required and cannot exceed 100 characters');
    }
    result.name = body.name.trim();
    result.normalizedName = result.name.toLowerCase();
  }
  if (body.image !== undefined || !partial) {
    if (body.image !== undefined && typeof body.image !== 'string') {
      throw httpError(400, 'Category image must be a URL or local path');
    }
    const image = (body.image || '').trim();
    if (image.length > 2000) {
      throw httpError(400, 'Category image URL cannot exceed 2000 characters');
    }
    result.image = image;
  }
  return result;
};

const ensureExistingCategories = async () => {
  const names = await Product.distinct('category');
  const uniqueNames = new Map();
  names.forEach((value) => {
    if (typeof value === 'string' && value.trim()) {
      const name = value.trim();
      uniqueNames.set(name.toLowerCase(), name);
    }
  });
  for (const [normalizedName, name] of uniqueNames) {
    await Category.updateOne(
      { normalizedName },
      { $setOnInsert: { name, normalizedName } },
      { upsert: true },
    );
  }
};

const getPublicCategories = async (request, response) => {
  const [categories, counts] = await Promise.all([
    Category.find().sort({ name: 1 }),
    Product.aggregate([
      { $match: { active: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
  ]);
  const countByName = new Map(counts.map(({ _id, count }) => [String(_id).toLowerCase(), count]));
  const results = categories.map((category) => ({
    _id: category._id,
    name: category.name,
    image: category.image,
    count: countByName.get(category.normalizedName) || 0,
  }));
  counts.forEach(({ _id, count }) => {
    const normalizedName = String(_id).toLowerCase();
    if (!results.some((category) => category.name.toLowerCase() === normalizedName)) {
      results.push({ name: String(_id), image: '', count });
    }
  });
  results.sort((left, right) => left.name.localeCompare(right.name));
  return response.status(200).json({ success: true, data: { categories: results } });
};

const getAdminCategories = async (request, response) => {
  await ensureExistingCategories();
  const categories = await Category.find().sort({ name: 1 });
  const counts = await Product.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const countByName = new Map(counts.map(({ _id, count }) => [String(_id).toLowerCase(), count]));
  return response.status(200).json({
    success: true,
    data: {
      categories: categories.map((category) => ({
        ...category.toObject(),
        productCount: countByName.get(category.normalizedName) || 0,
      })),
    },
  });
};

const createCategory = async (request, response) => {
  const categoryData = normalizeCategory(request.body);
  await ensureExistingCategories();
  const duplicate = await Category.findOne({ normalizedName: categoryData.normalizedName });
  if (duplicate) {
    throw httpError(409, 'A category with this name already exists');
  }
  const category = await Category.create(categoryData);
  await recordActivity(
    request.user,
    'CATEGORY_CREATED',
    'Category',
    category._id,
    `Created category ${category.name}`,
  );
  return response.status(201).json({ success: true, data: { category } });
};

const updateCategory = async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    throw httpError(404, 'Category not found');
  }
  const categoryData = normalizeCategory(request.body, true);
  const category = await Category.findById(request.params.id);
  if (!category) {
    throw httpError(404, 'Category not found');
  }
  if (
    categoryData.normalizedName
    && categoryData.normalizedName !== category.normalizedName
    && await Category.exists({
      normalizedName: categoryData.normalizedName,
      _id: { $ne: category._id },
    })
  ) {
    throw httpError(409, 'A category with this name already exists');
  }

  const previousName = category.name;
  const productIds = categoryData.name && categoryData.name !== previousName
    ? (await Product.find({ category: previousName }).select('_id')).map(({ _id }) => _id)
    : [];
  if (productIds.length) {
    await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: { category: categoryData.name } },
    );
  }
  Object.assign(category, categoryData);
  try {
    await category.save();
  } catch (error) {
    if (productIds.length) {
      await Product.updateMany(
        { _id: { $in: productIds } },
        { $set: { category: previousName } },
      );
    }
    throw error;
  }
  await recordActivity(
    request.user,
    'CATEGORY_UPDATED',
    'Category',
    category._id,
    `Updated category ${previousName} to ${category.name}`,
  );
  return response.status(200).json({ success: true, data: { category } });
};

const deleteCategory = async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    throw httpError(404, 'Category not found');
  }
  const category = await Category.findById(request.params.id);
  if (!category) {
    throw httpError(404, 'Category not found');
  }
  const productCount = await Product.countDocuments({ category: category.name });
  if (productCount > 0) {
    throw httpError(409, 'This category still has products. Reassign or remove them before deleting it.');
  }
  await category.deleteOne();
  await recordActivity(
    request.user,
    'CATEGORY_DELETED',
    'Category',
    category._id,
    `Deleted category ${category.name}`,
  );
  return response.status(200).json({ success: true, message: 'Category deleted' });
};

module.exports = {
  createCategory,
  deleteCategory,
  getAdminCategories,
  getPublicCategories,
  updateCategory,
};
