const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { test } = require('node:test');
const jwt = require('jsonwebtoken');

const queryResult = (value) => {
  const query = {
    select: () => query,
    sort: () => query,
    limit: () => query,
    populate: () => query,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
  return query;
};

const setSecret = (t) => {
  const previousSecret = process.env.JWT_SECRET;
  const secret = randomBytes(32).toString('hex');
  process.env.JWT_SECRET = secret;
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  return secret;
};

const startApi = async (t, user, secret) => {
  const User = require('../src/models/User');
  const app = require('../src/app');
  t.mock.method(User, 'findById', async (id) => (id === user._id ? user : null));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => new Promise((resolve) => server.close(resolve)));
  const token = jwt.sign({ sub: user._id }, secret, { expiresIn: '1h' });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const send = (resource, options = {}) => fetch(`${baseUrl}${resource}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(options.authenticated === false ? {} : { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...(options.body && !(options.body instanceof FormData) ? { body: JSON.stringify(options.body) } : {}),
  });
  return { send, server };
};

const adminUser = {
  _id: '65a000000000000000000011',
  name: 'Store Admin',
  email: 'admin@example.com',
  role: 'admin',
};

test('admin dashboard reports live aggregate counts and delivered-order revenue', async (t) => {
  const secret = setSecret(t);
  const Product = require('../src/models/Product');
  const User = require('../src/models/User');
  const Order = require('../src/models/Order');
  const Activity = require('../src/models/Activity');
  const recentOrders = [{ _id: 'order-1', status: 'Delivered', total: 2400 }];
  const lowStock = [{ _id: 'product-1', stock: 2 }];
  const activity = [{ _id: 'activity-1', description: 'Created a product' }];
  t.mock.method(Product, 'countDocuments', async () => 12);
  t.mock.method(Product, 'find', () => queryResult(lowStock));
  t.mock.method(User, 'countDocuments', async () => 7);
  t.mock.method(Order, 'countDocuments', async (filter) => (filter.status === 'Pending' ? 3 : 20));
  t.mock.method(Order, 'aggregate', async () => [{ total: 4800 }]);
  t.mock.method(Order, 'find', () => queryResult(recentOrders));
  t.mock.method(Activity, 'find', () => queryResult(activity));
  const { send } = await startApi(t, adminUser, secret);

  const response = await send('/admin/dashboard');
  assert.equal(response.status, 200);
  const data = (await response.json()).data;
  assert.deepEqual(data.statistics, {
    totalProducts: 12,
    totalCustomers: 7,
    totalOrders: 20,
    totalRevenue: 4800,
    pendingOrders: 3,
    lowStockProducts: 1,
  });
  assert.deepEqual(data.recentOrders, recentOrders);
  assert.deepEqual(data.lowStockProducts, lowStock);
  assert.deepEqual(data.recentActivity, activity);
});

test('customer tokens cannot access admin APIs', async (t) => {
  const secret = setSecret(t);
  const customer = {
    _id: '65a000000000000000000010',
    name: 'Customer',
    email: 'customer@example.com',
    role: 'customer',
  };
  const { send } = await startApi(t, customer, secret);

  for (const resource of ['/admin/dashboard', '/admin/products', '/admin/users']) {
    const response = await send(resource);
    assert.equal(response.status, 403);
  }
});

test('admin product creation validates data and records activity', async (t) => {
  const secret = setSecret(t);
  const Product = require('../src/models/Product');
  const Category = require('../src/models/Category');
  const Activity = require('../src/models/Activity');
  const product = { _id: '65a000000000000000000001', name: 'Linen Shirt' };
  let created;
  t.mock.method(Category, 'updateOne', async () => ({ matchedCount: 1 }));
  t.mock.method(Product, 'create', async (input) => {
    created = input;
    return product;
  });
  t.mock.method(Activity, 'create', async (input) => input);
  const { send } = await startApi(t, adminUser, secret);

  const valid = {
    name: 'Linen Shirt',
    description: 'A relaxed linen shirt.',
    price: 2500,
    category: 'Shirts',
    gender: 'men',
    image: 'https://images.example.test/shirt.jpg',
    sizes: ['S', 'M'],
    colors: ['Black', 'White'],
    stock: 5,
    featured: true,
    active: true,
  };
  const response = await send('/admin/products', { method: 'POST', body: valid });
  assert.equal(response.status, 201);
  assert.equal(created.price, 2500);
  assert.equal(created.gender, 'men');
  assert.deepEqual(created.colors, ['Black', 'White']);

  const missingGender = { ...valid };
  delete missingGender.gender;
  const missingCollection = await send('/admin/products', { method: 'POST', body: missingGender });
  assert.equal(missingCollection.status, 400);

  const invalidCollection = await send('/admin/products', {
    method: 'POST',
    body: { ...valid, gender: 'children' },
  });
  assert.equal(invalidCollection.status, 400);

  const invalid = await send('/admin/products', {
    method: 'POST',
    body: { ...valid, stock: 2.5 },
  });
  assert.equal(invalid.status, 400);
});

test('admins can update product fields and delete products while recording activity', async (t) => {
  const secret = setSecret(t);
  const Product = require('../src/models/Product');
  const Activity = require('../src/models/Activity');
  let deleteCount = 0;
  const product = {
    _id: '65a000000000000000000001',
    name: 'Linen Shirt',
    active: true,
    save: async () => {},
    deleteOne: async () => {
      deleteCount += 1;
    },
  };
  t.mock.method(Product, 'findById', async () => product);
  t.mock.method(Activity, 'create', async (entry) => entry);
  const { send } = await startApi(t, adminUser, secret);

  const updated = await send('/admin/products/65a000000000000000000001', {
    method: 'PUT',
    body: { active: false },
  });
  assert.equal(updated.status, 200);
  assert.equal(product.active, false);

  const collectionUpdated = await send('/admin/products/65a000000000000000000001', {
    method: 'PUT',
    body: { gender: 'women' },
  });
  assert.equal(collectionUpdated.status, 200);
  assert.equal(product.gender, 'women');

  const deleted = await send('/admin/products/65a000000000000000000001', { method: 'DELETE' });
  assert.equal(deleted.status, 200);
  assert.equal(deleteCount, 1);
});

test('admin product listing filters by collection and includes unassigned legacy products', async (t) => {
  const secret = setSecret(t);
  const Product = require('../src/models/Product');
  let filter;
  t.mock.method(Product, 'find', (query) => {
    filter = query;
    return queryResult([]);
  });
  const { send } = await startApi(t, adminUser, secret);

  const men = await send('/admin/products?gender=men&category=Denim');
  assert.equal(men.status, 200);
  assert.equal(filter.gender, 'men');
  assert.equal(filter.category.test('Denim'), true);

  const unassigned = await send('/admin/products?gender=unassigned');
  assert.equal(unassigned.status, 200);
  assert.equal(filter.gender, null);

  const invalid = await send('/admin/products?gender=unknown');
  assert.equal(invalid.status, 400);
});

test('admin customer listing selects safe fields only', async (t) => {
  const secret = setSecret(t);
  const User = require('../src/models/User');
  const customer = { _id: '65a000000000000000000010', name: 'Customer', email: 'customer@example.com' };
  let selectedFields;
  t.mock.method(User, 'find', () => ({
    select: (fields) => {
      selectedFields = fields;
      return queryResult([customer]);
    },
  }));
  const { send } = await startApi(t, adminUser, secret);

  const response = await send('/admin/users?search=customer');
  assert.equal(response.status, 200);
  assert.equal(selectedFields, 'name email phone createdAt');
  assert.deepEqual((await response.json()).data.customers, [customer]);
  assert.equal(Object.prototype.hasOwnProperty.call(customer, 'password'), false);
});

test('category creation and rename keep product category values in sync', async (t) => {
  const secret = setSecret(t);
  const Category = require('../src/models/Category');
  const Product = require('../src/models/Product');
  const Activity = require('../src/models/Activity');
  let currentCategory = null;
  let updatedProductFilter;
  const category = {
    _id: '65a000000000000000000020',
    name: 'Shirts',
    normalizedName: 'shirts',
    image: '',
    save: async () => {},
  };
  t.mock.method(Product, 'distinct', async () => []);
  t.mock.method(Category, 'updateOne', async () => ({ matchedCount: 1 }));
  t.mock.method(Category, 'findOne', async () => currentCategory);
  t.mock.method(Category, 'create', async (data) => {
    Object.assign(category, data);
    currentCategory = category;
    return category;
  });
  t.mock.method(Category, 'findById', async () => category);
  t.mock.method(Category, 'exists', async () => null);
  t.mock.method(Product, 'find', () => ({
    select: () => queryResult([{ _id: '65a000000000000000000001' }]),
  }));
  t.mock.method(Product, 'updateMany', async (filter) => {
    updatedProductFilter = filter;
    return { matchedCount: 1 };
  });
  t.mock.method(Activity, 'create', async (entry) => entry);
  const { send } = await startApi(t, adminUser, secret);

  const created = await send('/admin/categories', {
    method: 'POST',
    body: { name: 'Shirts', image: '' },
  });
  assert.equal(created.status, 201);

  const renamed = await send('/admin/categories/65a000000000000000000020', {
    method: 'PUT',
    body: { name: 'Tops', image: '' },
  });
  assert.equal(renamed.status, 200);
  assert.equal(category.name, 'Tops');
  assert.deepEqual(updatedProductFilter._id.$in, ['65a000000000000000000001']);
});

test('category deletion is rejected while any products still use it', async (t) => {
  const secret = setSecret(t);
  const Category = require('../src/models/Category');
  const Product = require('../src/models/Product');
  const category = {
    _id: '65a000000000000000000020',
    name: 'Shirts',
    deleteOne: async () => {
      throw new Error('A category with products must not be deleted');
    },
  };
  t.mock.method(Category, 'findById', async () => category);
  t.mock.method(Product, 'countDocuments', async () => 2);
  const { send } = await startApi(t, adminUser, secret);

  const response = await send('/admin/categories/65a000000000000000000020', { method: 'DELETE' });
  assert.equal(response.status, 409);
});

test('public category catalogue includes stored images and live product counts', async (t) => {
  const secret = setSecret(t);
  const Category = require('../src/models/Category');
  const Product = require('../src/models/Product');
  const categories = [{
    _id: '65a000000000000000000020',
    name: 'Shirts',
    normalizedName: 'shirts',
    image: '/uploads/categories/shirts.jpg',
  }];
  t.mock.method(Category, 'find', () => queryResult(categories));
  t.mock.method(Product, 'aggregate', async () => [{ _id: 'Shirts', count: 3 }]);
  const { send } = await startApi(t, adminUser, secret);

  const response = await send('/categories');
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data.categories, [{
    _id: categories[0]._id,
    name: 'Shirts',
    image: categories[0].image,
    count: 3,
  }]);
});

test('image upload validates content and serves the saved image', async (t) => {
  const secret = setSecret(t);
  const { send, server } = await startApi(t, adminUser, secret);
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf5sAAAAASUVORK5CYII=',
    'base64',
  );
  const form = new FormData();
  form.append('image', new Blob([png], { type: 'image/png' }), 'sample.png');
  const response = await send('/admin/uploads/image?kind=product', { method: 'POST', body: form });
  assert.equal(response.status, 201);
  const { image } = (await response.json()).data;
  const storedPath = path.resolve(__dirname, '../uploads', image.slice('/uploads/'.length));
  t.after(async () => fs.unlink(storedPath).catch(() => {}));

  const servedImage = await fetch(`http://127.0.0.1:${server.address().port}${image}`);
  assert.equal(servedImage.status, 200);
  assert.equal(servedImage.headers.get('content-type'), 'image/png');

  const invalidForm = new FormData();
  invalidForm.append('image', new Blob(['not an image'], { type: 'image/png' }), 'fake.png');
  const invalidImage = await send('/admin/uploads/image?kind=product', {
    method: 'POST',
    body: invalidForm,
  });
  assert.equal(invalidImage.status, 400);

  const oversizedForm = new FormData();
  oversizedForm.append(
    'image',
    new Blob([Buffer.alloc(5 * 1024 * 1024 + 1, 0xff)], { type: 'image/jpeg' }),
    'oversized.jpg',
  );
  const oversizedImage = await send('/admin/uploads/image?kind=product', {
    method: 'POST',
    body: oversizedForm,
  });
  assert.equal(oversizedImage.status, 413);
});
