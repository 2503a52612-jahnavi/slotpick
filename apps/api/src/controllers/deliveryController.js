const crypto = require('crypto');
const mongoose = require('mongoose');

const Delivery = require('../models/Delivery');
const DeliverySlot = require('../models/DeliverySlot');
const User = require('../models/User');
const { canTransitionDelivery } = require('../utils/deliveryStatus');
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

async function lookupDelivery(req, res) {
  const { name, platform, orderId } = req.body;
  const delivery = await Delivery.findOne({
    platform,
    orderId,
  }).populate('slots');
  const normalizedName = name.trim().toLowerCase();
  if (
    !delivery ||
    delivery.customerName?.trim().toLowerCase() !== normalizedName
  ) {
    throw new HttpError(404, 'We could not find that order.');
  }

  const trackingToken = crypto.randomBytes(32).toString('hex');
  delivery.trackingTokenHash = hashToken(trackingToken);
  await delivery.save();

  res.json({
    delivery: {
      orderId: delivery.orderId,
      platform: delivery.platform,
      address: delivery.address,
      status: delivery.status,
      selectionExpiresAt: delivery.selectionExpiresAt,
      slots: delivery.slots.map(serializeSlot),
    },
    trackingToken,
  });
}

async function getTrackedDelivery(req, res) {
  const delivery = await Delivery.findOne({
    trackingTokenHash: hashToken(req.params.token),
  })
    .populate('slots')
    .populate('selectedSlotId')
    .populate({ path: 'assignedAgent', select: 'name' });
  if (!delivery) throw new HttpError(404, 'Delivery not found');

  const statusHistory = delivery.statusHistory?.length
    ? delivery.statusHistory
    : [{ status: delivery.status, at: delivery.createdAt }];
  res.json({
    delivery: {
      orderId: delivery.orderId,
      platform: delivery.platform,
      address: delivery.address,
      status: delivery.status,
      selectionExpiresAt: delivery.selectionExpiresAt,
      selectedSlot: delivery.selectedSlotId ? serializeSlot(delivery.selectedSlotId) : null,
      slots: delivery.slots.map(serializeSlot),
      statusHistory: statusHistory.map(({ status, at }) => ({ status, at })),
      assignedAgentName: delivery.assignedAgent?.name || null,
    },
  });
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
  const slot = await reserveDeliverySlot(existing, req.body.slotId, now);

  res.json({
    slotId: String(slot._id),
    date: slot.date,
    start: slot.start,
    end: slot.end,
  });
}

async function bookTrackedSlot(req, res) {
  const delivery = await Delivery.findOne({
    trackingTokenHash: hashToken(req.params.token),
  });
  if (!delivery) throw new HttpError(404, 'Delivery not found');

  const now = new Date();
  if (delivery.selectionExpiresAt <= now) {
    throw new HttpError(410, 'Delivery selection window has expired');
  }
  if (delivery.status !== 'pending') {
    throw new HttpError(409, 'This delivery has already been scheduled');
  }
  const slot = await reserveDeliverySlot(delivery, req.body.slotId, now);
  res.json({
    slotId: String(slot._id),
    date: slot.date,
    start: slot.start,
    end: slot.end,
  });
}

async function bookCustomerSlot(req, res) {
  const deliveryId = req.params.deliveryId;
  if (!/^[a-f\d]{24}$/i.test(deliveryId)) throw new HttpError(404, 'Delivery not found');

  const delivery = await Delivery.findOne({
    _id: deliveryId,
    customer: req.user._id,
  });
  if (!delivery) throw new HttpError(404, 'Delivery not found');

  const now = new Date();
  if (delivery.selectionExpiresAt <= now) {
    throw new HttpError(410, 'Delivery selection window has expired');
  }
  if (delivery.status !== 'pending') {
    throw new HttpError(409, 'This delivery has already been scheduled');
  }

  const slot = await reserveDeliverySlot(delivery, req.body.slotId, now, req.user._id);
  res.json({
    slotId: String(slot._id),
    date: slot.date,
    start: slot.start,
    end: slot.end,
  });
}

async function reserveDeliverySlot(delivery, slotId, now, customerId) {
  if (!delivery.slots.some((deliverySlotId) => String(deliverySlotId) === slotId)) {
    throw new HttpError(409, 'This slot is not available for the delivery');
  }

  const session = await mongoose.startSession();
  let slot;
  try {
    await session.withTransaction(async () => {
      slot = await DeliverySlot.findOneAndUpdate(
        {
          _id: slotId,
          active: true,
          $expr: { $lt: ['$bookedCount', '$capacity'] },
        },
        { $inc: { bookedCount: 1 } },
        { new: true, session }
      );
      if (!slot) throw new HttpError(409, 'This slot is no longer available');

      const deliveryFilter = {
        _id: delivery._id,
        status: 'pending',
        selectionExpiresAt: { $gt: now },
      };
      if (customerId) deliveryFilter.customer = customerId;

      const updated = await Delivery.findOneAndUpdate(
        deliveryFilter,
        {
          $set: { status: 'scheduled', selectedSlotId: slot._id },
          $push: { statusHistory: { status: 'scheduled', at: now } },
        },
        { new: true, session }
      );
      if (!updated) throw new HttpError(409, 'This delivery has already been scheduled');
    });
  } finally {
    await session.endSession();
  }

  return slot;
}

async function createDelivery(req, res) {
  const {
    platform,
    orderId,
    customerName,
    address,
    customerId,
    assignedAgentId,
    selectionMinutes,
    slots,
  } = req.body;
  const delivery = { platform, orderId, address };

  if (customerId) {
    const customer = await User.findOne({ _id: customerId, role: 'customer', active: true });
    if (!customer) throw new HttpError(404, 'Customer not found');
    delivery.customer = customer._id;
    delivery.customerName = customerName || customer.name;
  } else if (customerName) {
    delivery.customerName = customerName;
  }

  if (assignedAgentId) {
    const agent = await User.findOne({ _id: assignedAgentId, role: 'agent', active: true });
    if (!agent) throw new HttpError(404, 'Delivery agent not found');
    delivery.assignedAgent = agent._id;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
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
    statusHistory: [{ status: 'pending', at: now }],
  });
  await created.populate('slots');

  res.status(201).json({
    delivery: {
      id: String(created._id),
      platform: created.platform,
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
    .select('platform orderId customerName address status selectionExpiresAt selectedSlotId slots createdAt')
    .populate('slots selectedSlotId')
    .sort({ createdAt: -1 });
  res.json({ deliveries });
}

async function updateAssignedDeliveryStatus(req, res) {
  const deliveryId = req.params.deliveryId;
  if (!/^[a-f\d]{24}$/i.test(deliveryId)) throw new HttpError(404, 'Delivery not found');

  const delivery = await Delivery.findOne({
    _id: deliveryId,
    assignedAgent: req.user._id,
  }).populate('slots selectedSlotId');
  if (!delivery) throw new HttpError(404, 'Delivery not found');

  const nextStatus = req.body.status;
  if (
    !canTransitionDelivery(
      delivery.status,
      nextStatus,
      Boolean(delivery.selectedSlotId)
    )
  ) {
    throw new HttpError(409, `Cannot change delivery status from ${delivery.status} to ${nextStatus}`);
  }
  if (delivery.status === nextStatus) {
    return res.json({ delivery });
  }

  const updated = await Delivery.findOneAndUpdate(
    {
      _id: delivery._id,
      assignedAgent: req.user._id,
      status: delivery.status,
    },
    {
      $set: { status: nextStatus },
      $push: { statusHistory: { status: nextStatus, at: new Date() } },
    },
    { returnDocument: 'after' }
  ).populate('slots selectedSlotId');
  if (!updated) throw new HttpError(409, 'Delivery status was updated by another request');

  res.json({ delivery: updated });
}

async function listCustomerDeliveries(req, res) {
  const deliveries = await Delivery.find({ customer: req.user._id })
    .select('platform orderId address status selectionExpiresAt selectedSlotId slots createdAt')
    .populate('slots selectedSlotId')
    .sort({ createdAt: -1 });
  res.json({ deliveries });
}

module.exports = {
  lookupDelivery,
  getTrackedDelivery,
  bookTrackedSlot,
  getDelivery,
  bookSlot,
  bookCustomerSlot,
  createDelivery,
  listAssignedDeliveries,
  updateAssignedDeliveryStatus,
  listCustomerDeliveries,
};
