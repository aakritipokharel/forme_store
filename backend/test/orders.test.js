const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { test } = require('node:test');
const jwt = require('jsonwebtoken');

const validDelivery = {
  recipientName: 'Alex Customer',
  phone: '9800000000',
  province: 'Bagmati',
  district: 'Kathmandu',
  municipality: 'Kathmandu',
  wardNumber: 4,
  streetAddress: '10 Main Street',
  instructions: 'Call on arrival',
};

const createSession = (t, mongoose) => {
  const session = {
    withTransaction: async (operation) => operation(),
    endSession: async () => {},
  };
  t.mock.method(mongoose, 'startSession', async () => session);
  return session;
};

const startApi = async (t, { user, secret }) => {
  const User = require('../src/models/User');
  const app = require('../src/app');
  t.mock.method(User, 'findById', async (id) => (id === user._id ? user : null));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => new Promise((resolve) => server.close(resolve)));
  const token = jwt.sign({ sub: user._id }, secret, { expiresIn: '1h' });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/orders`;
  const send = (path, options = {}) => fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.authenticated === false ? {} : { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  return { send, token };
};

const withTestEnvironment = (t, secret) => {
  const previousSecret = process.env.JWT_SECRET;
  const previousFee = process.env.DELIVERY_FEE_NPR;
  process.env.JWT_SECRET = secret;
  process.env.DELIVERY_FEE_NPR = '150';
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
    if (previousFee === undefined) delete process.env.DELIVERY_FEE_NPR;
    else process.env.DELIVERY_FEE_NPR = previousFee;
  });
};

test('checkout prices current products, snapshots delivery, reserves stock and clears cart', async (t) => {
  const secret = randomBytes(32).toString('hex');
  withTestEnvironment(t, secret);
  const mongoose = require('mongoose');
  const Cart = require('../src/models/Cart');
  const Product = require('../src/models/Product');
  const Order = require('../src/models/Order');
  const Activity = require('../src/models/Activity');
  const user = { _id: '65a000000000000000000010', name: 'Alex Customer', email: 'alex@example.com', role: 'customer' };
  const product = {
    _id: '65a000000000000000000001',
    name: 'Linen Shirt',
    image: '/images/linen-shirt.jpg',
    price: 2500,
    sizes: ['S', 'M'],
    colors: ['Black', 'White'],
    active: true,
    stock: 5,
  };
  const cart = {
    _id: '65a000000000000000000020',
    user: user._id,
    updatedAt: new Date(),
    items: [{ product: product._id, size: 'M', color: 'Black', quantity: 2 }],
  };
  const createdOrder = { _id: '65a000000000000000000030', orderNumber: 'FORME-12345678' };
  let stockUpdate;
  let cartUpdate;

  createSession(t, mongoose);
  t.mock.method(Order, 'findOne', async () => null);
  t.mock.method(Cart, 'findOne', async () => cart);
  t.mock.method(Product, 'find', async () => [product]);
  t.mock.method(Product, 'findOneAndUpdate', async (...args) => {
    stockUpdate = args;
    return { ...product, stock: 3, price: 2500 };
  });
  t.mock.method(Order, 'create', async ([document]) => {
    assert.equal(document.subtotal, 5000);
    assert.equal(document.total, 5150);
    assert.equal(document.paymentMethod, 'COD');
    assert.equal(document.delivery.email, user.email);
    assert.equal(document.delivery.wardNumber, 4);
    assert.equal(document.items[0].productName, product.name);
    assert.equal(document.items[0].unitPrice, 2500);
    return [createdOrder];
  });
  t.mock.method(Activity, 'create', async () => []);
  t.mock.method(Cart, 'updateOne', async (filter, update) => {
    cartUpdate = { filter, update };
    return { matchedCount: 1 };
  });

  const { send } = await startApi(t, { user, secret });
  const response = await send('/', {
    method: 'POST',
    headers: { 'Idempotency-Key': 'checkout-request-123' },
    body: { delivery: validDelivery, subtotal: 1, total: 1, paymentMethod: 'NOT-COD' },
  });
  assert.equal(response.status, 201);
  assert.deepEqual((await response.json()).data.order, createdOrder);
  assert.equal(stockUpdate[1].$inc.stock, -2);
  assert.equal(stockUpdate[0].stock.$gte, 2);
  assert.deepEqual(cartUpdate.update, { $set: { items: [] } });
  assert.equal(String(cartUpdate.filter._id), cart._id);
});

test('checkout rejects missing delivery data, empty carts, and insufficient stock', async (t) => {
  const secret = randomBytes(32).toString('hex');
  withTestEnvironment(t, secret);
  const mongoose = require('mongoose');
  const Cart = require('../src/models/Cart');
  const Product = require('../src/models/Product');
  const Order = require('../src/models/Order');
  const Activity = require('../src/models/Activity');
  const user = { _id: '65a000000000000000000010', name: 'Alex Customer', email: 'alex@example.com', role: 'customer' };
  const product = {
    _id: '65a000000000000000000001',
    name: 'Linen Shirt',
    image: '/images/linen-shirt.jpg',
    price: 2500,
    sizes: ['M'],
    colors: ['Black'],
    active: true,
    stock: 1,
  };
  createSession(t, mongoose);
  t.mock.method(Order, 'findOne', async () => null);
  let cartItems = [];
  t.mock.method(Cart, 'findOne', async () => ({
    _id: '65a000000000000000000020',
    updatedAt: new Date(),
    items: cartItems,
  }));
  t.mock.method(Product, 'find', async () => [product]);
  t.mock.method(Product, 'findOneAndUpdate', async () => null);
  t.mock.method(Order, 'create', async () => {
    throw new Error('An order must not be created for insufficient stock');
  });
  t.mock.method(Activity, 'create', async () => []);
  t.mock.method(Cart, 'updateOne', async () => ({ matchedCount: 1 }));

  const { send } = await startApi(t, { user, secret });
  const noDelivery = await send('/', {
    method: 'POST',
    headers: { 'Idempotency-Key': 'checkout-request-456' },
    body: {},
  });
  assert.equal(noDelivery.status, 400);

  const emptyCart = await send('/', {
    method: 'POST',
    headers: { 'Idempotency-Key': 'checkout-request-457' },
    body: { delivery: validDelivery },
  });
  assert.equal(emptyCart.status, 400);

  cartItems = [{ product: product._id, size: 'M', color: 'Black', quantity: 2 }];
  const insufficient = await send('/', {
    method: 'POST',
    headers: { 'Idempotency-Key': 'checkout-request-458' },
    body: { delivery: validDelivery },
  });
  assert.equal(insufficient.status, 409);
});

test('order endpoints enforce ownership and admin authorization', async (t) => {
  const secret = randomBytes(32).toString('hex');
  withTestEnvironment(t, secret);
  const Order = require('../src/models/Order');
  const user = { _id: '65a000000000000000000010', name: 'Alex Customer', email: 'alex@example.com', role: 'customer' };
  let requestedFilter;
  t.mock.method(Order, 'findOne', async (filter) => {
    requestedFilter = filter;
    return null;
  });
  const { send } = await startApi(t, { user, secret });

  const otherOrder = await send('/65a000000000000000000099');
  assert.equal(otherOrder.status, 403);
  const allOrders = await send('/');
  assert.equal(allOrders.status, 403);

  const privateOrder = await send('/my/65a000000000000000000099');
  assert.equal(privateOrder.status, 404);
  assert.equal(String(requestedFilter.user), user._id);
  assert.equal(requestedFilter._id, '65a000000000000000000099');
});

test('repeated checkout idempotency keys return the existing order without reserving stock twice', async (t) => {
  const secret = randomBytes(32).toString('hex');
  withTestEnvironment(t, secret);
  const Order = require('../src/models/Order');
  const user = { _id: '65a000000000000000000010', name: 'Alex Customer', email: 'alex@example.com', role: 'customer' };
  const existingOrder = { _id: '65a000000000000000000030', orderNumber: 'FORME-12345678' };
  t.mock.method(Order, 'findOne', async () => existingOrder);
  const { send } = await startApi(t, { user, secret });

  const response = await send('/', {
    method: 'POST',
    headers: { 'Idempotency-Key': 'checkout-request-123' },
    body: { delivery: validDelivery },
  });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data.order, existingOrder);
});

test('admins can advance an order through an allowed status transition', async (t) => {
  const secret = randomBytes(32).toString('hex');
  withTestEnvironment(t, secret);
  const mongoose = require('mongoose');
  const Order = require('../src/models/Order');
  const Product = require('../src/models/Product');
  const Activity = require('../src/models/Activity');
  const admin = { _id: '65a000000000000000000011', name: 'Store Admin', email: 'admin@example.com', role: 'admin' };
  let order = {
    _id: '65a000000000000000000030',
    orderNumber: 'FORME-12345678',
    status: 'Pending',
    stockRestored: false,
    items: [{ product: '65a000000000000000000001', quantity: 2 }],
    populate: async () => order,
  };
  createSession(t, mongoose);
  let updateFilter;
  t.mock.method(Order, 'findOneAndUpdate', (filter, update) => ({
    session: async () => {
      updateFilter = filter;
      const previousStatus = order.status;
      if (!filter.status.$in.includes(previousStatus)) {
        return null;
      }
      order.status = update.$set.status;
      const previousOrder = { ...order, status: previousStatus };
      previousOrder.populate = async () => previousOrder;
      return previousOrder;
    },
  }));
  t.mock.method(Activity, 'create', async () => []);
  const adminApi = await startApi(t, { user: admin, secret });

  const update = await adminApi.send('/65a000000000000000000030/status', {
    method: 'PATCH',
    body: { status: 'Confirmed' },
  });
  assert.equal(update.status, 200);
  assert.equal(order.status, 'Confirmed');
  assert.deepEqual(updateFilter.status, { $in: ['Pending'] });
});

test('customers may cancel only pending orders and stock restoration is recorded', async (t) => {
  const secret = randomBytes(32).toString('hex');
  withTestEnvironment(t, secret);
  const mongoose = require('mongoose');
  const Order = require('../src/models/Order');
  const Product = require('../src/models/Product');
  const Activity = require('../src/models/Activity');
  const user = { _id: '65a000000000000000000010', name: 'Alex Customer', email: 'alex@example.com', role: 'customer' };
  const order = {
    _id: '65a000000000000000000030',
    orderNumber: 'FORME-12345678',
    user: user._id,
    status: 'Pending',
    stockRestored: false,
    items: [{ product: '65a000000000000000000001', quantity: 2 }],
    save: async () => {},
  };
  let stockRestores = 0;
  createSession(t, mongoose);
  t.mock.method(Order, 'findOne', async () => order);
  let stockUpdates;
  t.mock.method(Product, 'bulkWrite', async (operations) => {
    stockRestores += 1;
    stockUpdates = operations;
    return { matchedCount: 1 };
  });
  t.mock.method(Activity, 'create', async () => []);
  const { send } = await startApi(t, { user, secret });

  const cancelled = await send('/my/65a000000000000000000030/cancel', { method: 'POST' });
  assert.equal(cancelled.status, 200);
  assert.equal(order.status, 'Cancelled');
  assert.equal(order.stockRestored, true);
  assert.deepEqual(stockUpdates[0].updateOne.update.$inc, { stock: 2 });

  const repeated = await send('/my/65a000000000000000000030/cancel', { method: 'POST' });
  assert.equal(repeated.status, 409);
  assert.equal(stockRestores, 1);
});
