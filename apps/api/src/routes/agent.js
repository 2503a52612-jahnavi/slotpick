const express = require('express');

const { requireAuth, requireRole } = require('../middleware/auth');
const deliveryController = require('../controllers/deliveryController');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
router.use(requireAuth, requireRole('agent'));
router.get('/deliveries', asyncHandler(deliveryController.listAssignedDeliveries));

module.exports = router;
