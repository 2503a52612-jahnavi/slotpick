const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const mongoose = require('mongoose');

const Delivery = require('../src/models/Delivery');
const DeliverySlot = require('../src/models/DeliverySlot');
const deliveryController = require('../src/controllers/deliveryController');
const deliveryRoutes = require('../src/routes/deliveries');
const { deliveryLookupSchema } = require('../src/middleware/schemas');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function startTestServer(t, app) {
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('guest lookup returns the same generic 404 when the name does not match', async (t) => {
  let lookupFilter;
  t.mock.method(Delivery, 'findOne', (filter) => {
    lookupFilter = filter;
    return {
      populate(path) {
        assert.equal(path, 'slots');
        return Promise.resolve({
          customerName: 'Jahnavi',
          slots: [],
        });
      },
    };
  });

  const app = express();
  app.use(express.json());
  app.use('/api/deliveries', deliveryRoutes);
  app.use((error, req, res, next) => {
    const status = error.status || 500;
    res.status(status).json({ error: status >= 500 ? 'Server error' : error.message });
  });

  const baseUrl = await startTestServer(t, app);
  const response = await fetch(`${baseUrl}/api/deliveries/lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '  Someone Else ', platform: 'Amazon', orderId: 'ID_101' }),
  });

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'We could not find that order.' });
  assert.deepEqual(lookupFilter, {
    platform: 'Amazon',
    orderId: 'ID_101',
  });
});

test('guest lookup trims the name and matches it without case sensitivity', async (t) => {
  const slotId = '507f1f77bcf86cd799439011';
  let storedTokenHash;
  const delivery = {
    customerName: ' Jahnavi ',
    orderId: 'ID_101',
    platform: 'Amazon',
    address: '12 Station Road',
    status: 'pending',
    selectionExpiresAt: new Date(Date.now() + 60_000),
    slots: [{
      _id: slotId,
      date: '2030-01-15',
      start: '09:00',
      end: '11:00',
      active: true,
      bookedCount: 0,
      capacity: 1,
    }],
    async save() {
      storedTokenHash = this.trackingTokenHash;
    },
  };
  t.mock.method(Delivery, 'findOne', (filter) => {
    assert.deepEqual(filter, { platform: 'Amazon', orderId: 'ID_101' });
    return {
      populate: async (path) => {
        assert.equal(path, 'slots');
        return delivery;
      },
    };
  });

  const response = { body: null, json(body) { this.body = body; } };
  await deliveryController.lookupDelivery(
    {
      body: deliveryLookupSchema.parse({
        name: '  jAHnAvI  ',
        platform: 'Amazon',
        orderId: ' ID_101 ',
      }),
    },
    response
  );

  assert.equal(response.body.delivery.orderId, 'ID_101');
  assert.match(response.body.trackingToken, /^[a-f\d]{64}$/i);
  assert.equal(storedTokenHash, hashToken(response.body.trackingToken));
  assert.notEqual(storedTokenHash, response.body.trackingToken);
});

test('simultaneous tracked bookings for the last seat allow exactly one booking', async (t) => {
  const slotId = '507f1f77bcf86cd799439011';
  const slot = {
    _id: slotId,
    date: '2030-01-15',
    start: '09:00',
    end: '11:00',
    active: true,
    capacity: 1,
    bookedCount: 0,
  };
  const deliveries = ['first-token', 'second-token'].map((token, index) => ({
    _id: `delivery-${index}`,
    trackingTokenHash: hashToken(token),
    status: 'pending',
    selectionExpiresAt: new Date(Date.now() + 60_000),
    slots: [slotId],
    statusHistory: [{ status: 'pending', at: new Date() }],
  }));
  let conditionalUpdates = 0;

  t.mock.method(Delivery, 'findOne', async (filter) =>
    deliveries.find((delivery) => delivery.trackingTokenHash === filter.trackingTokenHash) || null
  );
  t.mock.method(DeliverySlot, 'findOneAndUpdate', async (filter, update) => {
    conditionalUpdates += 1;
    assert.equal(filter._id, slotId);
    assert.equal(filter.active, true);
    assert.deepEqual(filter.$expr, { $lt: ['$bookedCount', '$capacity'] });
    assert.deepEqual(update, { $inc: { bookedCount: 1 } });
    if (!slot.active || slot.bookedCount >= slot.capacity) return null;
    slot.bookedCount += update.$inc.bookedCount;
    return { ...slot };
  });
  t.mock.method(Delivery, 'findOneAndUpdate', async (filter, update) => {
    const delivery = deliveries.find(
      (item) => item._id === filter._id && item.status === filter.status
    );
    if (!delivery) return null;
    Object.assign(delivery, update.$set);
    delivery.statusHistory.push(update.$push.statusHistory);
    return delivery;
  });
  t.mock.method(mongoose, 'startSession', async () => ({
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  }));

  const outcomes = await Promise.allSettled(deliveries.map(async (delivery, index) => {
    const response = { body: null, json(body) { this.body = body; } };
    await deliveryController.bookTrackedSlot(
      { params: { token: index === 0 ? 'first-token' : 'second-token' }, body: { slotId } },
      response
    );
    return response.body;
  }));

  const successes = outcomes.filter((outcome) => outcome.status === 'fulfilled');
  const failures = outcomes.filter((outcome) => outcome.status === 'rejected');
  assert.equal(successes.length, 1);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].reason.status, 409);
  assert.equal(slot.bookedCount, 1);
  assert.equal(conditionalUpdates, 2);
});
