const express = require('express');

const deliveryController = require('../controllers/deliveryController');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { bookSlotSchema } = require('../middleware/schemas');

const router = express.Router();

router.get('/:token', asyncHandler(deliveryController.getDelivery));
router.post('/:token/slot', validate(bookSlotSchema), asyncHandler(deliveryController.bookSlot));

module.exports = router;
