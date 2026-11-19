const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const Delivery = require('../src/models/Delivery');
const deliveryController = require('../src/controllers/deliveryController');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

test('assigned delivery results include platform and customer name', async (t) => {
  const deliveries = [{
    orderId: 'ID_101',
    platform: 'Amazon',
    customerName: 'Jahnavi',
  }];
  let filter;
  let projection;

  t.mock.method(Delivery, 'find', (query) => {
    filter = query;
    const chain = {
      select(fields) {
        projection = fields;
        return chain;
      },
      populate() {
        return chain;
      },
      sort() {
        return Promise.resolve(deliveries);
      },
    };
    return chain;
  });

  const response = { json(body) { this.body = body; } };
  await deliveryController.listAssignedDeliveries(
    { user: { _id: 'assigned-agent-id' } },
    response
  );

  assert.deepEqual(filter, { assignedAgent: 'assigned-agent-id' });
  assert.match(projection, /platform/);
  assert.match(projection, /customerName/);
  assert.deepEqual(response.body.deliveries, deliveries);
});

test('agent status changes are assignment-scoped and recorded with a timestamp', async (t) => {
  const deliveryId = '507f1f77bcf86cd799439011';
  const agentId = '507f1f77bcf86cd799439012';
  const delivery = {
    _id: deliveryId,
    status: 'scheduled',
    selectedSlotId: '507f1f77bcf86cd799439013',
  };
  let lookupFilter;
  let updateFilter;
  let updateDocument;

  t.mock.method(Delivery, 'findOne', (filter) => {
    lookupFilter = filter;
    return { populate: async () => delivery };
  });
  t.mock.method(Delivery, 'findOneAndUpdate', (filter, update) => {
    updateFilter = filter;
    updateDocument = update;
    return {
      populate: async () => ({
        ...delivery,
        status: update.$set.status,
      }),
    };
  });

  const response = { json(body) { this.body = body; } };
  await deliveryController.updateAssignedDeliveryStatus(
    {
      params: { deliveryId },
      user: { _id: agentId },
      body: { status: 'out-for-delivery' },
    },
    response
  );

  assert.deepEqual(lookupFilter, { _id: deliveryId, assignedAgent: agentId });
  assert.deepEqual(updateFilter, {
    _id: deliveryId,
    assignedAgent: agentId,
    status: 'scheduled',
  });
  assert.deepEqual(updateDocument.$set, { status: 'out-for-delivery' });
  assert.equal(updateDocument.$push.statusHistory.status, 'out-for-delivery');
  assert.ok(updateDocument.$push.statusHistory.at instanceof Date);
  assert.equal(response.body.delivery.status, 'out-for-delivery');
});

test('invalid agent status transitions return a clear conflict without updating', async (t) => {
  const deliveryId = '507f1f77bcf86cd799439011';
  let updateCalled = false;
  t.mock.method(Delivery, 'findOne', () => ({
    populate: async () => ({
      _id: deliveryId,
      status: 'scheduled',
      selectedSlotId: '507f1f77bcf86cd799439013',
    }),
  }));
  t.mock.method(Delivery, 'findOneAndUpdate', () => {
    updateCalled = true;
    throw new Error('Unexpected status update');
  });

  await assert.rejects(
    deliveryController.updateAssignedDeliveryStatus(
      {
        params: { deliveryId },
        user: { _id: '507f1f77bcf86cd799439012' },
        body: { status: 'delivered' },
      },
      { json() {} }
    ),
    (error) => error.status === 409
      && error.message === 'Cannot change delivery status from scheduled to delivered'
  );
  assert.equal(updateCalled, false);
});

test('tracking returns agent status history and the assigned agent name', async (t) => {
  const trackingToken = 'private-test-tracking-token';
  const statusHistory = [
    { status: 'pending', at: new Date('2030-01-01T10:00:00Z') },
    { status: 'scheduled', at: new Date('2030-01-02T10:00:00Z') },
    { status: 'out-for-delivery', at: new Date('2030-01-03T10:00:00Z') },
  ];
  const delivery = {
    orderId: 'ID_101',
    platform: 'Amazon',
    address: '12 Station Road',
    status: 'out-for-delivery',
    selectionExpiresAt: new Date('2030-01-02T10:00:00Z'),
    selectedSlotId: null,
    slots: [],
    statusHistory,
    assignedAgent: { name: 'Demo Delivery Agent' },
  };
  let lookupFilter;
  const populatePaths = [];
  const query = {
    populate(path) {
      populatePaths.push(path);
      return query;
    },
    then(resolve, reject) {
      return Promise.resolve(delivery).then(resolve, reject);
    },
  };
  t.mock.method(Delivery, 'findOne', (filter) => {
    lookupFilter = filter;
    return query;
  });

  const response = { json(body) { this.body = body; } };
  await deliveryController.getTrackedDelivery(
    { params: { token: trackingToken } },
    response
  );

  assert.deepEqual(lookupFilter, { trackingTokenHash: hashToken(trackingToken) });
  assert.equal(populatePaths.length, 3);
  assert.equal(response.body.delivery.status, 'out-for-delivery');
  assert.deepEqual(response.body.delivery.statusHistory, statusHistory);
  assert.equal(response.body.delivery.assignedAgentName, 'Demo Delivery Agent');
});
