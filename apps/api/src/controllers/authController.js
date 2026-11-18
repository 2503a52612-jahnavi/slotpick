const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const HttpError = require('../utils/httpError');

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

function signToken(user) {
  return jwt.sign({ role: user.role, tokenVersion: user.tokenVersion || 0 }, process.env.JWT_SECRET, {
    subject: String(user._id),
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    algorithm: 'HS256',
  });
}

async function register(req, res) {
  const { name, email, phone, password } = req.body;
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, phone, passwordHash });
  res.status(201).json({ user, token: signToken(user) });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  const passwordOk = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

  if (!user || !passwordOk || !user.active) {
    throw new HttpError(401, 'Invalid email or password');
  }
  res.json({ user, token: signToken(user) });
}

function me(req, res) {
  res.json({ user: req.user });
}

async function changePassword(req, res) {
  const user = await User.findById(req.user._id).select('+passwordHash');
  const currentPasswordMatches = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
  if (!currentPasswordMatches) throw new HttpError(400, 'Current password is incorrect');

  const newPasswordMatches = await bcrypt.compare(req.body.newPassword, user.passwordHash);
  if (newPasswordMatches) throw new HttpError(400, 'Choose a password you have not used for this account');

  user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  res.json({ message: 'Password changed successfully', token: signToken(user) });
}

module.exports = { register, login, me, changePassword };
