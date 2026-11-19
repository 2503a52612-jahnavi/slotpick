const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

const Delivery = require('../src/models/Delivery');
const DeliverySlot = require('../src/models/DeliverySlot');
const User = require('../src/models/User');
const DEMO_TEAM_ACCOUNTS = require('../scripts/demoTeamAccounts');
const { seedDemoData } = require('../scripts/seedDemoData');

test('demo team accounts reset to fixed credentials and own all demo deliveries', async (t) => {
  const envKeys = [
    'NODE_ENV',
    'DEMO_AGENT_EMAIL',
    'DEMO_AGENT_PASSWORD',
    'DEMO_ADMIN_PASSWORD',
  ];
  const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  process.env.NODE_ENV = 'test';
  process.env.DEMO_AGENT_EMAIL = 'ignored-agent@slotpick.example';
  process.env.DEMO_AGENT_PASSWORD = 'ignored-agent-password';
  process.env.DEMO_ADMIN_PASSWORD = 'ignored-admin-password';
  t.after(() => {
    for (const key of envKeys) {
      if (previousEnv[key] === undefined) delete process.env[key];
      else process.env[key] = previousEnv[key];
    }
  });

  const users = new Map();
  const deliveryUpdates = [];
  const slotRecords = new Map();
  let slotSequence = 0;

  t.mock.method(User, 'findOne', async ({ email }) => users.get(email) || null);
  t.mock.method(User, 'create', async (values) => {
    const user = {
      ...values,
      _id: `${values.role}-id`,
      save: async function save() {},
    };
    users.set(user.email, user);
    return user;
  });
  t.mock.method(Delivery, 'find', () => {
    const query = {
      select() { return query; },
      lean: async () => [],
    };
    return query;
  });
  t.mock.method(Delivery, 'findOneAndUpdate', async (filter, update) => {
    deliveryUpdates.push({ filter, update });
    return null;
  });
  t.mock.method(Delivery, 'countDocuments', async () => 0);
  t.mock.method(DeliverySlot, 'findOneAndUpdate', async (filter) => {
    const key = `${filter.date}:${filter.start}:${filter.end}`;
    if (!slotRecords.has(key)) {
      slotSequence += 1;
      slotRecords.set(key, { _id: `slot-${slotSequence}` });
    }
    return slotRecords.get(key);
  });
  t.mock.method(DeliverySlot, 'findById', () => ({
    select: async () => ({ capacity: 5 }),
  }));
  t.mock.method(DeliverySlot, 'updateOne', async () => ({}));
  t.mock.method(console, 'log', () => {});

  await seedDemoData();
  for (const account of Object.values(DEMO_TEAM_ACCOUNTS)) {
    const user = users.get(account.email);
    user.active = false;
    user.name = 'Old demo name';
    user.passwordHash = await bcrypt.hash('old-demo-password', 4);
  }
  deliveryUpdates.length = 0;
  await seedDemoData();

  for (const account of Object.values(DEMO_TEAM_ACCOUNTS)) {
    const user = users.get(account.email);
    assert.equal(user.role, account.role);
    assert.equal(user.name, account.name);
    assert.equal(user.active, true);
    assert.equal(await bcrypt.compare(account.password, user.passwordHash), true);
  }
  assert.equal(users.has('ignored-agent@slotpick.example'), false);

  const assignedAgentId = users.get(DEMO_TEAM_ACCOUNTS.agent.email)._id;
  assert.deepEqual(
    deliveryUpdates.map(({ filter }) => filter.orderId).sort(),
    ['ID_101', 'ID_102', 'ID_103', 'ID_104', 'ID_105']
  );
  assert.ok(deliveryUpdates.every(
    ({ update }) => update.$set.assignedAgent === assignedAgentId
  ));
});
