const test = require('node:test');
const assert = require('node:assert/strict');

const { canTransitionDelivery } = require('../src/utils/deliveryStatus');

test('delivery status advances only through the supported lifecycle', () => {
  assert.equal(canTransitionDelivery('scheduled', 'out-for-delivery', true), true);
  assert.equal(canTransitionDelivery('out-for-delivery', 'delivered', true), true);
  assert.equal(canTransitionDelivery('scheduled', 'delivered', true), false);
  assert.equal(canTransitionDelivery('delivered', 'scheduled', true), false);
});

test('pending deliveries require a selected slot before they can be scheduled', () => {
  assert.equal(canTransitionDelivery('pending', 'scheduled', false), false);
  assert.equal(canTransitionDelivery('pending', 'scheduled', true), true);
});

test('repeating the current status is idempotent', () => {
  assert.equal(canTransitionDelivery('scheduled', 'scheduled', true), true);
});