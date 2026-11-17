require('dotenv').config();
const app = require('./app');
const { connectDb } = require('./db');
const { ensureAdminUser } = require('./services/adminSeeder');

const port = process.env.PORT || 4000;

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set in .env and be at least 32 characters');
  }
  await connectDb();
  await ensureAdminUser();
  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
