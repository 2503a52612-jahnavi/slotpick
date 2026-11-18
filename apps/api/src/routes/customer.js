const express = require('express');

const { requireAuth, requireRole } = require('../middleware/auth');
const deliveryController = require('../controllers/deliveryController');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { bookSlotSchema } = require('../middleware/schemas');

const router = express.Router();
router.use(requireAuth, requireRole('customer'));
router.get('/deliveries', asyncHandler(deliveryController.listCustomerDeliveries));
router.post(
  '/deliveries/:deliveryId/slot',
  validate(bookSlotSchema),
  asyncHandler(deliveryController.bookCustomerSlot)
);

module.exports = router;
