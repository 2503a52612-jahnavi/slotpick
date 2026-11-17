const bcrypt = require('bcryptjs');

const User = require('../models/User');

async function createAgent(req, res) {
  const { name, email, phone, password } = req.body;
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, phone, passwordHash, role: 'agent' });
  res.status(201).json({ user });
}

module.exports = { createAgent };
