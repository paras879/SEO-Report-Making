// Runs schema.sql against the database. Usage: npm run db:init or called on startup
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function initDb() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    console.log('Applying schema.sql ...');
    await client.query(sql);
    console.log('✅ Database schema created/updated successfully.');
  } catch (err) {
    console.error('❌ Schema init failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  initDb()
    .catch(() => { process.exitCode = 1; })
    .finally(() => pool.end());
}

module.exports = { initDb };
