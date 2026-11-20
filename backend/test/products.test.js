const assert = require('node:assert/strict');
const { test } = require('node:test');

test('product seed has four complete products per category and preserves original images', () => {
  const { products: seededProducts } = require('../scripts/seedProducts');
  const originalImages = new Map([
    ['Oversized T-shirt', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80'],
    ['Classic white shirt', 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=80'],
    ['Knit sweater', 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=80'],
    ['Straight-leg jeans', 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80'],
    ['Wide-leg trousers', 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=80'],
    ['Casual jacket', 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80'],
    ['Summer dress', 'https://images.unsplash.com/photo-1789110853872-f416085557fa?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D'],
    ['Basic hoodie', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80'],
  ]);
  const categoryNames = [
    'T-shirts',
    'Shirts',
    'Knitwear',
    'Denim',
    'Trousers',
    'Outerwear',
    'Dresses',
    'Hoodies',
  ];
  const productNames = new Set(seededProducts.map(({ name }) => name));
  const productImages = new Set(seededProducts.map(({ image }) => image));
  const additionalProducts = seededProducts.filter(({ name }) => !originalImages.has(name));

  assert.equal(seededProducts.length, 32);
  assert.equal(productNames.size, seededProducts.length);
  assert.equal(productImages.size, seededProducts.length);
  categoryNames.forEach((category) => {
    assert.equal(seededProducts.filter((product) => product.category === category).length, 4);
  });
  originalImages.forEach((image, name) => {
    assert.equal(seededProducts.find((product) => product.name === name)?.image, image);
  });
  assert.equal(additionalProducts.length, 24);
  additionalProducts.forEach((product) => {
    assert.ok(product.description);
    assert.ok(Number.isFinite(product.price) && product.price > 0);
    assert.ok(product.sizes.length > 0);
    assert.ok(product.colors.length > 0);
    assert.ok(Number.isInteger(product.stock) && product.stock >= 0);
    assert.equal(product.active, true);
    assert.equal(new URL(product.image).protocol, 'https:');
  });
});

test('public product endpoints return active products and support search and category filters', async (t) => {
  const Product = require('../src/models/Product');
  const app = require('../src/app');
  const products = [
    { _id: '65a000000000000000000001', name: 'Linen Shirt', category: 'Shirts', active: true },
    { _id: '65a000000000000000000002', name: 'Wool Coat', category: 'Outerwear', active: true },
  ];
  let listFilter;

  t.mock.method(Product, 'find', (filter) => {
    listFilter = filter;
    const matchingProducts = products.filter((product) => (
      product.active === filter.active
      && (!filter.category || filter.category.test(product.category))
      && (!filter.$or || filter.$or.some((condition) => {
        const [field, pattern] = Object.entries(condition)[0];
        return pattern.test(product[field]);
      }))
    ));
    return {
      sort: async () => matchingProducts,
    };
  });
  t.mock.method(Product, 'distinct', async () => ['Outerwear', 'Shirts']);
  t.mock.method(Product, 'findOne', async (filter) => (
    products.find((product) => product._id === filter._id && product.active === filter.active) || null
  ));

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => new Promise((resolve) => server.close(resolve)));

  const baseUrl = `http://127.0.0.1:${server.address().port}/api/products`;
  const listResponse = await fetch(baseUrl);
  assert.equal(listResponse.status, 200);
  assert.deepEqual((await listResponse.json()).data.products, products);
  assert.deepEqual(listFilter, { active: true });

  const filteredResponse = await fetch(`${baseUrl}?category=shirts&search=linen`);
  assert.equal(filteredResponse.status, 200);
  assert.deepEqual((await filteredResponse.json()).data.products, [products[0]]);
  assert.equal(listFilter.active, true);
  assert.equal(listFilter.category.test('Shirts'), true);
  assert.equal(listFilter.$or[0].name.test('Linen Shirt'), true);

  const categoriesResponse = await fetch(`${baseUrl}/categories`);
  assert.equal(categoriesResponse.status, 200);
  assert.deepEqual((await categoriesResponse.json()).data.categories, ['Outerwear', 'Shirts']);
});

test('product detail hides inactive and missing products and rejects invalid IDs as not found', async (t) => {
  const Product = require('../src/models/Product');
  const app = require('../src/app');
  const product = {
    _id: '65a000000000000000000001',
    name: 'Linen Shirt',
    active: true,
  };
  t.mock.method(Product, 'findOne', async (filter) => (
    filter._id === product._id && filter.active ? product : null
  ));

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => new Promise((resolve) => server.close(resolve)));

  const baseUrl = `http://127.0.0.1:${server.address().port}/api/products`;
  const found = await fetch(`${baseUrl}/${product._id}`);
  assert.equal(found.status, 200);
  assert.deepEqual((await found.json()).data.product, product);

  const invalid = await fetch(`${baseUrl}/not-an-object-id`);
  assert.equal(invalid.status, 404);
  assert.equal((await invalid.json()).success, false);

  const unavailable = await fetch(`${baseUrl}/65a000000000000000000002`);
  assert.equal(unavailable.status, 404);
  assert.equal((await unavailable.json()).success, false);
});

test('product listing rejects malformed filters and escapes search patterns', async (t) => {
  const Product = require('../src/models/Product');
  const app = require('../src/app');
  let searchPattern;

  t.mock.method(Product, 'find', (filter) => {
    searchPattern = filter.$or?.[0].name;
    return { sort: async () => [] };
  });

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => new Promise((resolve) => server.close(resolve)));

  const baseUrl = `http://127.0.0.1:${server.address().port}/api/products`;
  const malformed = await fetch(`${baseUrl}?search%5Bvalue%5D=shirt`);
  assert.equal(malformed.status, 400);

  const escaped = await fetch(`${baseUrl}?search=%5Bcoat%5D`);
  assert.equal(escaped.status, 200);
  assert.equal(searchPattern.test('[coat]'), true);
  assert.equal(searchPattern.test('a coat'), false);
});
