const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

const productFields = 'name price image category sizes colors stock active';
const cartProductOptions = { path: 'items.product', select: productFields };
const itemKey = (product, size, color) => JSON.stringify([product, size, color]);
const getProductId = (product) => String(product?._id || product);

const getCartDocument = async (userId) => {
  const cart = await Cart.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, items: [] } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return Cart.populate(cart, cartProductOptions);
};

const getCart = async (request, response) => {
  const cart = await getCartDocument(request.user._id);
  return response.status(200).json({
    success: true,
    data: { cart },
  });
};

const updateCart = async (request, response) => {
  const submittedItems = request.body?.items;
  if (!Array.isArray(submittedItems) || submittedItems.length > 100) {
    return response.status(400).json({
      success: false,
      message: 'Cart items must be an array of no more than 100 entries',
    });
  }

  const normalizedItems = new Map();
  for (const item of submittedItems) {
    if (
      !item
      || typeof item !== 'object'
      || typeof item.productId !== 'string'
      || !mongoose.isValidObjectId(item.productId)
      || (item.size !== undefined && typeof item.size !== 'string')
      || (item.color !== undefined && typeof item.color !== 'string')
      || !Number.isSafeInteger(item.quantity)
      || item.quantity < 1
    ) {
      return response.status(400).json({
        success: false,
        message: 'Each cart item needs a valid product, options, and whole-number quantity',
      });
    }

    const productId = item.productId;
    const size = (item.size || '').trim();
    const color = (item.color || '').trim();
    const key = itemKey(productId, size, color);
    const current = normalizedItems.get(key);
    normalizedItems.set(key, {
      productId,
      size,
      color,
      quantity: item.quantity + (current?.quantity || 0),
    });
  }

  const items = [...normalizedItems.values()];
  const productIds = [...new Set(items.map(({ productId }) => productId))];
  const [products, existingCart] = await Promise.all([
    productIds.length ? Product.find({ _id: { $in: productIds } }) : [],
    Cart.findOne({ user: request.user._id }),
  ]);
  const productById = new Map(products.map((product) => [String(product._id), product]));
  const existingItems = existingCart?.items || [];
  const existingByKey = new Map(existingItems.map((item) => [
    itemKey(getProductId(item.product), item.size || '', item.color || ''),
    item,
  ]));

  for (const item of items) {
    const product = productById.get(item.productId);
    const previous = existingByKey.get(itemKey(item.productId, item.size, item.color));
    if (!product) {
      return response.status(409).json({
        success: false,
        message: 'A product in your cart is no longer available. Remove it and try again.',
      });
    }

    const mayKeepExistingSelection = previous && item.quantity <= previous.quantity;
    const validSize = product.sizes.length
      ? product.sizes.includes(item.size)
      : item.size === '';
    const validColor = product.colors.length
      ? product.colors.includes(item.color)
      : item.color === '';

    if ((!validSize || !validColor) && !mayKeepExistingSelection) {
      return response.status(400).json({
        success: false,
        message: 'Select an available size and color for each product',
      });
    }

    if (
      (!product.active || item.quantity > product.stock)
      && !mayKeepExistingSelection
    ) {
      return response.status(409).json({
        success: false,
        message: product.active
          ? `Only ${product.stock} item${product.stock === 1 ? '' : 's'} available for ${product.name}`
          : `${product.name} is no longer available`,
      });
    }
  }

  const cart = await Cart.findOneAndUpdate(
    { user: request.user._id },
    {
      $set: {
        items: items.map(({ productId, size, color, quantity }) => ({
          product: productId,
          size,
          color,
          quantity,
        })),
      },
      $setOnInsert: { user: request.user._id },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );
  const populatedCart = await Cart.populate(cart, cartProductOptions);

  return response.status(200).json({
    success: true,
    data: { cart: populatedCart },
  });
};

module.exports = {
  getCart,
  updateCart,
};
