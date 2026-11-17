require('dotenv').config();
const mongoose = require('mongoose');
const { connectDb } = require('../src/db');
const { ensureAdminUser } = require('../src/services/adminSeeder');

async function main() {
  await connectDb();
  await ensureAdminUser();
  console.log('Admin account is ready');
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
