const express = require('express');
const { rateLimit } = require('express-rate-limit');

const deliveryController = require('../controllers/deliveryController');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { bookSlotSchema, deliveryLookupSchema } = require('../middleware/schemas');

const router = express.Router();

const lookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many order lookup attempts. Please try again later.' },
});

router.post(
  '/lookup',
  lookupLimiter,
  validate(deliveryLookupSchema),
  asyncHandler(deliveryController.lookupDelivery)
);
router.get('/track/:token', asyncHandler(deliveryController.getTrackedDelivery));
router.post(
  '/track/:token/slot',
  validate(bookSlotSchema),
  asyncHandler(deliveryController.bookTrackedSlot)
);
router.get('/:token', asyncHandler(deliveryController.getDelivery));
router.post('/:token/slot', validate(bookSlotSchema), asyncHandler(deliveryController.bookSlot));

module.exports = router;
