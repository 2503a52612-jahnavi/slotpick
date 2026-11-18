const express = require('express');

const { requireAuth, requireRole } = require('../middleware/auth');
const deliveryController = require('../controllers/deliveryController');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { deliveryStatusSchema } = require('../middleware/schemas');

const router = express.Router();
router.use(requireAuth, requireRole('agent'));
router.get('/deliveries', asyncHandler(deliveryController.listAssignedDeliveries));
router.patch(
  '/deliveries/:deliveryId/status',
  validate(deliveryStatusSchema),
  asyncHandler(deliveryController.updateAssignedDeliveryStatus)
);

module.exports = router;
