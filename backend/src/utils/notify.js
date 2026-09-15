const { pool } = require('../config/db');

// In-app notification create karta hai
async function notify({ userId, title, message, reportId }) {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, related_report_id)
       VALUES ($1,$2,$3,$4)`,
      [userId, title, message || null, reportId || null]
    );
  } catch (err) {
    console.error('Notify failed:', err.message);
  }
}

module.exports = { notify };
