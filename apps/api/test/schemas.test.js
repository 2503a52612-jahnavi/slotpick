const test = require('node:test');
const assert = require('node:assert/strict');

const {
  registerSchema,
  loginSchema,
  createDeliverySchema,
  bookSlotSchema,
  deliveryStatusSchema,
} = require('../src/middleware/schemas');

test('public registration normalizes email and cannot choose a privileged role', () => {
  const result = registerSchema.parse({
    name: ' Customer ',
    email: 'CUSTOMER@example.com ',
    password: 'valid-password',
    role: 'admin',
  });

  assert.equal(result.name, 'Customer');
  assert.equal(result.email, 'customer@example.com');
  assert.equal(Object.hasOwn(result, 'role'), false);
});

test('login normalizes email', () => {
  const result = loginSchema.parse({ email: 'USER@example.com', password: 'secret' });
  assert.equal(result.email, 'user@example.com');
});

test('delivery input validates calendar dates and slot ordering, with safe defaults', () => {
  const result = createDeliverySchema.parse({
    orderId: 'ORD-1',
    address: '12 Station Road',
    slots: [{ date: '2027-01-15', start: '09:00', end: '11:00' }],
  });

  assert.equal(result.selectionMinutes, 10);
  assert.equal(result.slots[0].capacity, 1);
  assert.equal(
    createDeliverySchema.safeParse({
      orderId: 'ORD-2',
      address: '12 Station Road',
      slots: [{ date: '2027-02-30', start: '11:00', end: '09:00' }],
    }).success,
    false
  );
  assert.equal(
    createDeliverySchema.safeParse({
      orderId: 'ORD-2',
      address: '12 Station Road',
      slots: [{ date: '2020-01-01', start: '09:00', end: '11:00' }],
    }).success,
    false
  );
});

test('duplicate slots and malformed booking ids are rejected', () => {
  const duplicated = createDeliverySchema.safeParse({
    orderId: 'ORD-3',
    address: '12 Station Road',
    slots: [
      { date: '2027-01-15', start: '09:00', end: '11:00' },
      { date: '2027-01-15', start: '09:00', end: '11:00' },
    ],
  });

  assert.equal(duplicated.success, false);
  assert.equal(bookSlotSchema.safeParse({ slotId: 'not-an-object-id' }).success, false);
  assert.equal(deliveryStatusSchema.safeParse({ status: 'out-for-delivery' }).success, true);
  assert.equal(deliveryStatusSchema.safeParse({ status: 'skip-to-delivered' }).success, false);
});
