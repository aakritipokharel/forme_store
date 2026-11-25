const mongoose = require('mongoose');
const { PRODUCT_GENDERS } = require('../constants/product');
const Product = require('../models/Product');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getProducts = async (request, response) => {
  const { category, gender, search } = request.query;
  const hasUnsupportedQuery = Object.keys(request.query)
    .some((key) => !['category', 'gender', 'search'].includes(key));

  if (
    hasUnsupportedQuery
    || (category !== undefined && typeof category !== 'string')
    || (gender !== undefined && typeof gender !== 'string')
    || (search !== undefined && typeof search !== 'string')
  ) {
    return response.status(400).json({
      success: false,
      message: 'Category, collection, and search filters must be text values',
    });
  }

  if ((category && category.length > 100) || (search && search.length > 100)) {
    return response.status(400).json({
      success: false,
      message: 'Category and search cannot exceed 100 characters',
    });
  }
  if (gender !== undefined && !PRODUCT_GENDERS.includes(gender)) {
    return response.status(400).json({
      success: false,
      message: 'Collection must be men, women, or unisex',
    });
  }

  const filter = { active: true };
  if (gender) {
    filter.gender = gender;
  }
  if (category?.trim()) {
    filter.category = new RegExp(`^${escapeRegex(category.trim())}$`, 'i');
  }
  if (search?.trim()) {
    const searchPattern = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [
      { name: searchPattern },
      { description: searchPattern },
      { category: searchPattern },
    ];
  }

  const products = await Product.find(filter).sort({ createdAt: -1 });
  return response.status(200).json({
    success: true,
    data: { products },
  });
};

const getProductCategories = async (request, response) => {
  const { gender } = request.query;
  if (
    gender !== undefined
    && (typeof gender !== 'string' || !PRODUCT_GENDERS.includes(gender))
  ) {
    return response.status(400).json({
      success: false,
      message: 'Collection must be men, women, or unisex',
    });
  }
  const filter = { active: true };
  if (gender) {
    filter.gender = gender;
  }
  const categories = await Product.distinct('category', filter);
  return response.status(200).json({
    success: true,
    data: { categories: categories.sort((left, right) => left.localeCompare(right)) },
  });
};

const getProductById = async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(404).json({
      success: false,
      message: 'Product not found',
    });
  }

  const product = await Product.findOne({
    _id: request.params.id,
    active: true,
  });

  if (!product) {
    return response.status(404).json({
      success: false,
      message: 'Product not found or unavailable',
    });
  }

  return response.status(200).json({
    success: true,
    data: { product },
  });
};

module.exports = {
  getProductById,
  getProductCategories,
  getProducts,
};
