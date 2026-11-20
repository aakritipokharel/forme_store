const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { test } = require('node:test');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

test('authentication endpoints validate credentials and enforce database roles', async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  const testSecret = randomBytes(32).toString('hex');
  process.env.JWT_SECRET = testSecret;

  const User = require('../src/models/User');
  const app = require('../src/app');
  const users = [];
  const adminUser = {
    _id: 'admin-1',
    name: 'Store Admin',
    email: 'admin@example.com',
    role: 'admin',
  };

  t.mock.method(User, 'findOne', (filter) => {
    const result = users.find((user) => user.email === filter.email) || null;
    const query = {
      select() {
        return query;
      },
      then(resolve, reject) {
        return Promise.resolve(result).then(resolve, reject);
      },
    };
    return query;
  });
  t.mock.method(User, 'create', async (values) => {
    const user = {
      ...values,
      _id: 'customer-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    users.push(user);
    return user;
  });
  t.mock.method(User, 'findById', async (id) => (
    users.find((user) => String(user._id) === id) || (id === 'admin-1' ? adminUser : null)
  ));

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

  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const send = (path, { body, token, ...options } = {}) => fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const missingFields = await send('/auth/register', {
    method: 'POST',
    body: { email: 'customer@example.com' },
  });
  assert.equal(missingFields.status, 400);

  const registration = await send('/auth/register', {
    method: 'POST',
    body: {
      name: '  Customer One ',
      email: 'CUSTOMER@example.com ',
      password: 'a-secure-password',
      role: 'admin',
    },
  });
  assert.equal(registration.status, 201);
  const registrationBody = await registration.json();
  assert.equal(registrationBody.data.user.role, 'customer');
  assert.equal(registrationBody.data.user.email, 'customer@example.com');
  assert.equal('password' in registrationBody.data.user, false);
  assert.notEqual(users[0].password, 'a-secure-password');
  assert.equal(await bcrypt.compare('a-secure-password', users[0].password), true);

  const duplicate = await send('/auth/register', {
    method: 'POST',
    body: { name: 'Customer Two', email: 'customer@example.com', password: 'another-password' },
  });
  assert.equal(duplicate.status, 409);

  const badLogin = await send('/auth/login', {
    method: 'POST',
    body: { email: 'customer@example.com', password: 'incorrect-password' },
  });
  assert.equal(badLogin.status, 401);

  const login = await send('/auth/login', {
    method: 'POST',
    body: { email: 'CUSTOMER@example.com', password: 'a-secure-password' },
  });
  assert.equal(login.status, 200);
  const loginBody = await login.json();
  assert.equal('password' in loginBody.data.user, false);
  assert.equal(jwt.verify(loginBody.data.token, testSecret).sub, 'customer-1');

  const missingToken = await send('/auth/me');
  assert.equal(missingToken.status, 401);
  const invalidToken = await send('/auth/me', { token: 'not-a-token' });
  assert.equal(invalidToken.status, 401);

  const profile = await send('/auth/me', { token: loginBody.data.token });
  assert.equal(profile.status, 200);
  assert.equal((await profile.json()).data.user.email, 'customer@example.com');

  const customerAdminAccess = await send('/admin/me', { token: loginBody.data.token });
  assert.equal(customerAdminAccess.status, 403);

  const forgedRoleToken = jwt.sign(
    { sub: 'customer-1', role: 'admin' },
    testSecret,
    { expiresIn: '1h' },
  );
  const forgedAdminAccess = await send('/admin/me', { token: forgedRoleToken });
  assert.equal(forgedAdminAccess.status, 403);

  const adminToken = jwt.sign({ sub: 'admin-1', role: 'admin' }, testSecret, { expiresIn: '1h' });
  const adminAccess = await send('/admin/me', { token: adminToken });
  assert.equal(adminAccess.status, 200);
  const adminBody = await adminAccess.json();
  assert.equal(adminBody.data.user.role, 'admin');
  assert.equal('password' in adminBody.data.user, false);
});
