const crypto = require('crypto');
const mongoose = require('mongoose');

const Delivery = require('../models/Delivery');
const DeliverySlot = require('../models/DeliverySlot');
const User = require('../models/User');
const HttpError = require('../utils/httpError');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function serializeSlot(slot) {
  return {
    id: String(slot._id),
    date: slot.date,
    start: slot.start,
    end: slot.end,
    available: slot.active && slot.bookedCount < slot.capacity,
  };
}

async function getDelivery(req, res) {
  const delivery = await Delivery.findOne({ deliveryTokenHash: hashToken(req.params.token) })
    .populate('slots')
    .populate('selectedSlotId');
  if (!delivery) throw new HttpError(404, 'Delivery not found');
  if (delivery.status === 'pending' && delivery.selectionExpiresAt <= new Date()) {
    throw new HttpError(410, 'Delivery selection window has expired');
  }
  if (delivery.status !== 'pending' && delivery.status !== 'scheduled') {
    throw new HttpError(410, 'Delivery selection is no longer available');
  }

  res.json({
    orderId: delivery.orderId,
    address: delivery.address,
    selectionExpiresAt: delivery.selectionExpiresAt,
    slots: delivery.slots.map(serializeSlot),
    status: delivery.status,
    selectedSlot: delivery.selectedSlotId ? serializeSlot(delivery.selectedSlotId) : null,
  });
}

async function bookSlot(req, res) {
  const tokenHash = hashToken(req.params.token);
  const now = new Date();
  const existing = await Delivery.findOne({ deliveryTokenHash: tokenHash });
  if (!existing) throw new HttpError(404, 'Delivery not found');
  if (existing.selectionExpiresAt <= now) {
    throw new HttpError(410, 'Delivery selection window has expired');
  }
  if (existing.status !== 'pending') {
    throw new HttpError(409, 'This delivery has already been scheduled');
  }
  if (!existing.slots.some((slotId) => String(slotId) === req.body.slotId)) {
    throw new HttpError(409, 'This slot is not available for the delivery');
  }

  const session = await mongoose.startSession();
  let slot;
  try {
    await session.withTransaction(async () => {
      slot = await DeliverySlot.findOneAndUpdate(
        {
          _id: req.body.slotId,
          active: true,
          $expr: { $lt: ['$bookedCount', '$capacity'] },
        },
        { $inc: { bookedCount: 1 } },
        { new: true, session }
      );
      if (!slot) throw new HttpError(409, 'This slot is no longer available');

      const delivery = await Delivery.findOneAndUpdate(
        {
          _id: existing._id,
          status: 'pending',
          selectionExpiresAt: { $gt: now },
        },
        { $set: { status: 'scheduled', selectedSlotId: slot._id } },
        { new: true, session }
      );
      if (!delivery) throw new HttpError(409, 'This delivery has already been scheduled');
    });
  } finally {
    await session.endSession();
  }

  res.json({
    slotId: String(slot._id),
    date: slot.date,
    start: slot.start,
    end: slot.end,
  });
}

async function createDelivery(req, res) {
  const { orderId, address, customerId, assignedAgentId, selectionMinutes, slots } = req.body;
  const delivery = { orderId, address };

  if (customerId) {
    const customer = await User.findOne({ _id: customerId, role: 'customer', active: true });
    if (!customer) throw new HttpError(404, 'Customer not found');
    delivery.customer = customer._id;
  }

  if (assignedAgentId) {
    const agent = await User.findOne({ _id: assignedAgentId, role: 'agent', active: true });
    if (!agent) throw new HttpError(404, 'Delivery agent not found');
    delivery.assignedAgent = agent._id;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const selectionExpiresAt = new Date(Date.now() + selectionMinutes * 60 * 1000);
  const availableSlots = [];
  for (const slot of slots) {
    const record = await DeliverySlot.findOneAndUpdate(
      { date: slot.date, start: slot.start, end: slot.end },
      {
        $setOnInsert: {
          capacity: slot.capacity,
          bookedCount: 0,
          active: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    availableSlots.push(record._id);
  }

  const created = await Delivery.create({
    ...delivery,
    deliveryTokenHash: hashToken(token),
    selectionExpiresAt,
    slots: availableSlots,
  });
  await created.populate('slots');

  res.status(201).json({
    delivery: {
      id: String(created._id),
      orderId: created.orderId,
      address: created.address,
      selectionExpiresAt: created.selectionExpiresAt,
      slots: created.slots.map(serializeSlot),
    },
    token,
    linkPath: `#/d/${token}`,
  });
}

async function listAssignedDeliveries(req, res) {
  const deliveries = await Delivery.find({ assignedAgent: req.user._id })
    .select('orderId address status selectionExpiresAt selectedSlotId slots createdAt')
    .populate('slots selectedSlotId')
    .sort({ createdAt: -1 });
  res.json({ deliveries });
}

async function listCustomerDeliveries(req, res) {
  const deliveries = await Delivery.find({ customer: req.user._id })
    .select('orderId address status selectionExpiresAt selectedSlotId slots createdAt')
    .populate('slots selectedSlotId')
    .sort({ createdAt: -1 });
  res.json({ deliveries });
}

module.exports = {
  getDelivery,
  bookSlot,
  createDelivery,
  listAssignedDeliveries,
  listCustomerDeliveries,
};
