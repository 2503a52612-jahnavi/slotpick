const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function ensureAdminUser() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = (process.env.ADMIN_NAME || 'Admin').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL must be set to a valid email address');
  }
  if (password.length < 8 || password.length > 72) {
    throw new Error('ADMIN_PASSWORD must be between 8 and 72 characters');
  }
  if (name.length < 2 || name.length > 80) {
    throw new Error('ADMIN_NAME must be between 2 and 80 characters');
  }

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== 'admin') {
      throw new Error('ADMIN_EMAIL is already used by a non-admin account');
    }
    return existing;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    return await User.create({ name, email, passwordHash, role: 'admin', active: true });
  } catch (error) {
    if (error.code !== 11000) throw error;

    const racedUser = await User.findOne({ email });
    if (racedUser && racedUser.role === 'admin') return racedUser;
    throw error;
  }
}

module.exports = { ensureAdminUser };
