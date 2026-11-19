const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const express = require('express');

const User = require('../src/models/User');
const authRoutes = require('../src/routes/auth');

async function startTestServer(t, app) {
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('the login API accepts both demo team roles', async (t) => {
  const users = [
    {
      _id: 'agent-id',
      name: 'Demo Delivery Agent',
      email: 'demo-agent@slotpick.example',
      passwordHash: 'test-password-hash',
      role: 'agent',
      tokenVersion: 0,
      active: true,
      toJSON() {
        const { passwordHash, ...safeUser } = this;
        return safeUser;
      },
    },
    {
      _id: 'admin-id',
      name: 'Demo Admin',
      email: 'demo-admin@slotpick.example',
      passwordHash: 'test-password-hash',
      role: 'admin',
      tokenVersion: 0,
      active: true,
      toJSON() {
        const { passwordHash, ...safeUser } = this;
        return safeUser;
      },
    },
  ];
  t.mock.method(User, 'findOne', (filter) => ({
    select: async (projection) => {
      assert.equal(projection, '+passwordHash');
      return users.find((user) => user.email === filter.email) || null;
    },
  }));
  t.mock.method(bcrypt, 'compare', async (password, passwordHash) =>
    password === 'team-test-password' && passwordHash === 'test-password-hash'
  );

  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'unit-test-only-signing-key-not-a-real-account-secret';
  t.after(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use((error, req, res, next) => {
    const status = error.status || 500;
    res.status(status).json({ error: status >= 500 ? 'Server error' : error.message });
  });
  const baseUrl = await startTestServer(t, app);

  for (const user of users) {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'team-test-password' }),
    });
    const result = await response.json();

    assert.equal(response.status, 200);
    assert.equal(result.user.role, user.role);
    assert.equal(result.user.email, user.email);
    assert.equal('passwordHash' in result.user, false);
    assert.equal(typeof result.token, 'string');
  }
});
