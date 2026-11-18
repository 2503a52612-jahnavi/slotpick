require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const mongoose = require('mongoose');

const { connectDb } = require('../src/db');
const Delivery = require('../src/models/Delivery');
const DeliverySlot = require('../src/models/DeliverySlot');
const User = require('../src/models/User');

const CUSTOMER_EMAIL = 'jahnavi@test.com';
const DEFAULT_AGENT_EMAIL = 'demo-agent@slotpick.example';
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

async function ensureDemoAgent() {
  const email = (process.env.DEMO_AGENT_EMAIL || DEFAULT_AGENT_EMAIL).trim().toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== 'agent') {
      throw new Error('DEMO_AGENT_EMAIL is already used by a non-agent account');
    }
    if (!existing.active) {
      existing.active = true;
      await existing.save();
    }
    return existing;
  }

  const password = process.env.DEMO_AGENT_PASSWORD || crypto.randomBytes(32).toString('hex');
  const passwordHash = await bcrypt.hash(password, 12);
  return User.create({
    name: 'Demo Delivery Agent',
    email,
    passwordHash,
    role: 'agent',
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

async function findDemoDelivery(customerId) {
  for (let sequence = 1; sequence <= 100; sequence += 1) {
    const orderId = `DEMO-SLOT-${String(sequence).padStart(3, '0')}`;
    const delivery = await Delivery.findOne({ customer: customerId, orderId });
    if (!delivery || delivery.status === 'pending') return { orderId, delivery };
  }
  throw new Error('Could not find an available demo order ID');
}

async function seedDemoData() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo data cannot be seeded when NODE_ENV is production');
  }

  const customer = await User.findOne({ email: CUSTOMER_EMAIL, role: 'customer', active: true });
  if (!customer) {
    throw new Error(`Active customer ${CUSTOMER_EMAIL} was not found`);
  }

  const agent = await ensureDemoAgent();
  const slots = await ensureDemoSlots(demoDate());
  const { orderId, delivery } = await findDemoDelivery(customer._id);
  const selectionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  if (delivery) {
    delivery.platform = 'Amazon';
    delivery.address = '12 Station Road, Hanamkonda';
    delivery.assignedAgent = agent._id;
    delivery.selectionExpiresAt = selectionExpiresAt;
    delivery.slots = slots.map((slot) => slot._id);
    await delivery.save();
  } else {
    await Delivery.create({
      platform: 'Amazon',
      orderId,
      address: '12 Station Road, Hanamkonda',
      customer: customer._id,
      assignedAgent: agent._id,
      deliveryTokenHash: crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex'),
      selectionExpiresAt,
      status: 'pending',
      slots: slots.map((slot) => slot._id),
    });
  }

  console.log(
    `Demo delivery ${orderId} is ready for ${CUSTOMER_EMAIL}; ` +
    `${slots.length} slots; assigned agent ${agent.email}; database ${mongoose.connection.name}`
  );
}

connectDb()
  .then(seedDemoData)
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
