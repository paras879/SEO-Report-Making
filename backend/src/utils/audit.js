const { pool } = require('../config/db');

// Har important action ko audit_logs me record karta hai (security).
async function logAudit({ userId, action, entityType, entityId, details, req }) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null) : null;
    const ua = req ? req.headers['user-agent'] || null : null;
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [userId || null, action, entityType || null, entityId || null, details ? JSON.stringify(details) : null, ip, ua]
    );
  } catch (err) {
    // audit failure kabhi main flow ko na roke
    console.error('Audit log failed:', err.message);
  }
}

module.exports = { logAudit };
