// Runs schema.sql against the database. Usage: npm run db:init
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

(async () => {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    console.log('Applying schema.sql ...');
    await client.query(sql);
    console.log('✅ Database schema created/updated successfully.');
  } catch (err) {
    console.error('❌ Schema init failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
