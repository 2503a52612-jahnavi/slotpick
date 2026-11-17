const express = require('express');

const { requireAuth, requireRole } = require('../middleware/auth');
const deliveryController = require('../controllers/deliveryController');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
router.use(requireAuth, requireRole('customer'));
router.get('/deliveries', asyncHandler(deliveryController.listCustomerDeliveries));

module.exports = router;
