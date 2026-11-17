const jwt = require('jsonwebtoken');
const User = require('../models/User');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

const requireAuth = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'Missing or invalid Authorization header');
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.active) throw new HttpError(401, 'Account not found or disabled');

  req.user = user;
  next();
});

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role)
    ? next()
    : next(new HttpError(403, 'You do not have permission to do this'));

module.exports = { requireAuth, requireRole };
