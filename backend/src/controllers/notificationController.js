const { pool } = require('../config/db');

// GET /api/notifications
async function listNotifications(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    const unread = rows.filter((n) => !n.is_read).length;
    res.json({ success: true, unread, notifications: rows });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/notifications/:id/read
async function markRead(req, res, next) {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [
      req.params.id, req.user.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/notifications/read-all
async function markAllRead(req, res, next) {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/notifications/:id
async function deleteNotification(req, res, next) {
  try {
    await pool.query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [
      req.params.id, req.user.id,
    ]);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/notifications/clear-all
async function clearAllNotifications(req, res, next) {
  try {
    await pool.query('DELETE FROM notifications WHERE user_id = $1', [req.user.id]);
    res.json({ success: true, message: 'All notifications cleared' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listNotifications, markRead, markAllRead, deleteNotification, clearAllNotifications };

