require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const mongoose = require('mongoose');

const { connectDb } = require('../src/db');
const Delivery = require('../src/models/Delivery');
const DeliverySlot = require('../src/models/DeliverySlot');
const User = require('../src/models/User');

const DEFAULT_CUSTOMER_EMAIL = 'demo-customer@slotpick.example';
const DEFAULT_CUSTOMER_PASSWORD = 'DemoCustomer123!';
const DEFAULT_AGENT_EMAIL = 'demo-agent@slotpick.example';
const DEFAULT_AGENT_PASSWORD = 'DemoAgent123!';
const DEMO_ORDERS = [
  { platform: 'Amazon', orderId: 'ID_101' },
  { platform: 'Flipkart', orderId: 'ID_102' },
  { platform: 'Myntra', orderId: 'ID_103' },
  { platform: 'Ajio', orderId: 'ID_104' },
  { platform: 'Meesho', orderId: 'ID_105' },
];
const SLOT_TIMES = [
  ['09:00', '11:00'],
  ['11:00', '13:00'],
  ['14:00', '16:00'],
];

function demoDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 7);
  return date.toISOString().slice(0, 10);
}

async function ensureDemoUser({ email, password, name, role }) {
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== role) {
      throw new Error(`${email} is already used by a non-${role} account`);
    }
    existing.active = true;
    existing.passwordHash = await bcrypt.hash(password, 12);
    await existing.save();
    return existing;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  return User.create({
    name,
    email,
    passwordHash,
    role,
    active: true,
  });
}

async function ensureDemoSlots(date) {
  const slots = [];
  for (const [start, end] of SLOT_TIMES) {
    let slot = await DeliverySlot.findOneAndUpdate(
      { date, start, end },
      {
        $setOnInsert: { capacity: 5, bookedCount: 0, active: true },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    if (!slot.active || slot.bookedCount >= slot.capacity) {
      slot.active = true;
      slot.capacity = Math.max(slot.capacity, slot.bookedCount + 5);
      await slot.save();
    }
    slots.push(slot);
  }
  return slots;
}

async function seedDemoData() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo data cannot be seeded when NODE_ENV is production');
  }

  const customerEmail = (process.env.DEMO_CUSTOMER_EMAIL || DEFAULT_CUSTOMER_EMAIL)
    .trim()
    .toLowerCase();
  const customerPassword = process.env.DEMO_CUSTOMER_PASSWORD || DEFAULT_CUSTOMER_PASSWORD;
  const agentEmail = (process.env.DEMO_AGENT_EMAIL || DEFAULT_AGENT_EMAIL)
    .trim()
    .toLowerCase();
  const agentPassword = process.env.DEMO_AGENT_PASSWORD || DEFAULT_AGENT_PASSWORD;
  const customer = await ensureDemoUser({
    email: customerEmail,
    password: customerPassword,
    name: 'Demo Customer',
    role: 'customer',
  });
  const agent = await ensureDemoUser({
    email: agentEmail,
    password: agentPassword,
    name: 'Demo Delivery Agent',
    role: 'agent',
  });
  const slots = await ensureDemoSlots(demoDate());
  const selectionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  for (const { platform, orderId } of DEMO_ORDERS) {
    await Delivery.findOneAndUpdate(
      { platform, orderId },
      {
        $set: {
          address: '12 Station Road, Hanamkonda',
          customer: customer._id,
          assignedAgent: agent._id,
          selectionExpiresAt,
          slots: slots.map((slot) => slot._id),
        },
        $setOnInsert: {
          deliveryTokenHash: crypto.createHash('sha256')
            .update(crypto.randomBytes(32))
            .digest('hex'),
          status: 'pending',
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  }

  console.log(
    `Demo orders ${DEMO_ORDERS.map(({ orderId }) => orderId).join(', ')} are ready for ` +
    `${customer.email}; ${slots.length} slots each; assigned agent ${agent.email}; ` +
    `database ${mongoose.connection.name}`
  );
}

connectDb()
  .then(seedDemoData)
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
