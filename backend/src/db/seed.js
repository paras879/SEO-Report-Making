// Creates the first Super Admin from .env. Usage: npm run db:seed
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
require('dotenv').config();

(async () => {
  const client = await pool.connect();
  try {
    const name = process.env.SUPERADMIN_NAME || 'Super Admin';
    const email = (process.env.SUPERADMIN_EMAIL || 'superadmin@example.com').toLowerCase();
    const username = process.env.SUPERADMIN_USERNAME || 'superadmin';
    const password = process.env.SUPERADMIN_PASSWORD || 'Super@12345';

    const existing = await client.query(
      "SELECT id FROM users WHERE role = 'super_admin' LIMIT 1"
    );
    if (existing.rows.length > 0) {
      console.log('ℹ️  Super Admin already exists. Skipping seed.');
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    const res = await client.query(
      `INSERT INTO users (name, email, username, password_hash, role, is_active)
       VALUES ($1,$2,$3,$4,'super_admin',TRUE) RETURNING id, username, email`,
      [name, email, username, hash]
    );
    console.log('✅ Super Admin created:', res.rows[0]);
    console.log('   Login username:', username);
    console.log('   Login password:', password, '(change after first login!)');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
