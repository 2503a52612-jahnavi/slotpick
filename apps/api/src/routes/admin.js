const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { agentSchema, createDeliverySchema } = require('../middleware/schemas');
const adminController = require('../controllers/adminController');
const deliveryController = require('../controllers/deliveryController');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get('/ping', (req, res) => {
  res.json({ message: `Hello admin ${req.user.name}` });
});

router.post('/agents', validate(agentSchema), asyncHandler(adminController.createAgent));
router.post(
  '/deliveries',
  validate(createDeliverySchema),
  asyncHandler(deliveryController.createDelivery)
);

module.exports = router;
