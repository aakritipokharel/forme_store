const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { test } = require('node:test');
const jwt = require('jsonwebtoken');

test('cart API protects account carts and validates variants and stock', async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  const testSecret = randomBytes(32).toString('hex');
  process.env.JWT_SECRET = testSecret;

  const User = require('../src/models/User');
  const Product = require('../src/models/Product');
  const Cart = require('../src/models/Cart');
  const app = require('../src/app');
  const user = { _id: '65a000000000000000000010', role: 'customer' };
  const product = {
    _id: '65a000000000000000000001',
    name: 'Linen Shirt',
    price: 2500,
    image: '/images/linen-shirt.jpg',
    category: 'Shirts',
    sizes: ['S', 'M'],
    colors: ['Black', 'White'],
    stock: 4,
    active: true,
  };
  const cart = { user: user._id, items: [] };
  const savedUpdates = [];

  t.mock.method(User, 'findById', async (id) => (id === user._id ? user : null));
  t.mock.method(Product, 'find', async () => [product]);
  t.mock.method(Cart, 'findOne', async () => cart);
  t.mock.method(Cart, 'findOneAndUpdate', async (filter, update) => {
    savedUpdates.push({ filter, update });
    cart.items = update.$set?.items || cart.items;
    return cart;
  });
  t.mock.method(Cart, 'populate', async (document) => document);

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (previousSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousSecret;
    }
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}/api/cart`;
  const token = jwt.sign({ sub: user._id }, testSecret, { expiresIn: '1h' });
  const send = (path, { body, authenticated = true, ...options } = {}) => fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(authenticated ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const unauthorized = await send('/', { authenticated: false });
  assert.equal(unauthorized.status, 401);

  const duplicateVariants = await send('/', {
    method: 'PUT',
    body: {
      items: [
        { productId: product._id, size: 'S', color: 'Black', quantity: 1 },
        { productId: product._id, size: 'S', color: 'Black', quantity: 2 },
        { productId: product._id, size: 'M', color: 'Black', quantity: 1 },
      ],
    },
  });
  assert.equal(duplicateVariants.status, 200);
  assert.deepEqual(
    cart.items.map(({ size, color, quantity }) => ({ size, color, quantity })),
    [
      { size: 'S', color: 'Black', quantity: 3 },
      { size: 'M', color: 'Black', quantity: 1 },
    ],
  );
  assert.equal(savedUpdates.length, 1);
  assert.equal(String(savedUpdates[0].filter.user), user._id);

  const exceedsStock = await send('/', {
    method: 'PUT',
    body: {
      items: [{ productId: product._id, size: 'S', color: 'Black', quantity: 5 }],
    },
  });
  assert.equal(exceedsStock.status, 409);
  assert.equal(savedUpdates.length, 1);

  const invalidVariant = await send('/', {
    method: 'PUT',
    body: {
      items: [{ productId: product._id, size: 'XXL', color: 'Black', quantity: 1 }],
    },
  });
  assert.equal(invalidVariant.status, 400);
  assert.equal(savedUpdates.length, 1);
});
