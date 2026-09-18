const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
require('dotenv').config();

async function seedAccounts() {
  const client = await pool.connect();
  try {
    await client.query("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'supervisor'");
    await client.query("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'designer'");
    await client.query("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'editor'");

    const devHash = await bcrypt.hash('Dev@12345', 12);
    const desHash = await bcrypt.hash('Design@12345', 12);
    const supHash = await bcrypt.hash('Supervisor@12345', 12);

    await client.query(
      `INSERT INTO users (name, email, username, password_hash, role, is_active)
       VALUES ('Alex Developer', 'developer@example.com', 'developer', $1, 'developer', TRUE)
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, is_active = TRUE`,
      [devHash]
    );

    await client.query(
      `INSERT INTO users (name, email, username, password_hash, role, is_active)
       VALUES ('Sophia Editor', 'designer@example.com', 'designer', $1, 'designer', TRUE)
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, is_active = TRUE`,
      [desHash]
    );

    await client.query(
      `INSERT INTO users (name, email, username, password_hash, role, is_active)
       VALUES ('Marcus Supervisor', 'supervisor@example.com', 'supervisor', $1, 'supervisor', TRUE)
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, is_active = TRUE`,
      [supHash]
    );

    console.log('✅ Developer, Editor, and Supervisor accounts seeded successfully!');
  } catch (err) {
    console.error('❌ Error seeding accounts:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedAccounts();
