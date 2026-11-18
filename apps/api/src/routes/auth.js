const express = require('express');
const rateLimit = require('express-rate-limit');

const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { registerSchema, loginSchema, changePasswordSchema } = require('../middleware/schemas');
const authController = require('../controllers/authController');

const router = express.Router();

// At most 20 register/login attempts per 15 minutes per IP address
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});

router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(authController.register)
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(authController.login)
);

router.get('/me', requireAuth, authController.me);
router.post(
  '/password',
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword)
);

module.exports = router;
