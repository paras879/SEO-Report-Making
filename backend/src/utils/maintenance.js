const { pool } = require('../config/db');

// Retention: purane log/notification/token rows delete karo taaki DB kabhi na bhare.
// Business data (reports, notes, messages, dev_requests, comments) ko HAATH NAHI lagate.
const RETAIN_NOTIF_DAYS = Number(process.env.RETAIN_NOTIF_DAYS) || 30;   // read notifications
const RETAIN_AUDIT_DAYS = Number(process.env.RETAIN_AUDIT_DAYS) || 90;   // audit logs

async function runCleanup() {
  try {
    // 1) read notifications older than N days (unread kabhi delete nahi hote)
    const n = await pool.query(
      `DELETE FROM notifications WHERE is_read = TRUE AND created_at < now() - make_interval(days => $1)`,
      [RETAIN_NOTIF_DAYS]
    );
    // 2) old audit logs
    const a = await pool.query(
      `DELETE FROM audit_logs WHERE created_at < now() - make_interval(days => $1)`,
      [RETAIN_AUDIT_DAYS]
    );
    // 3) expired ya revoked refresh tokens (kabhi kaam ke nahi rehte)
    const t = await pool.query(
      `DELETE FROM refresh_tokens WHERE revoked = TRUE OR expires_at < now()`
    );
    console.log(`[maintenance] cleanup done — notifications:${n.rowCount} audit:${a.rowCount} tokens:${t.rowCount}`);
  } catch (err) {
    console.error('[maintenance] cleanup failed:', err.message);
  }
}

let started = false;
function startMaintenance() {
  if (started) return; // double-start se bachav
  started = true;
  // boot ke 60s baad pehli baar, phir har 24 ghante
  setTimeout(runCleanup, 60 * 1000);
  setInterval(runCleanup, 24 * 60 * 60 * 1000);
  console.log('[maintenance] retention job scheduled (daily)');
}

module.exports = { runCleanup, startMaintenance };
