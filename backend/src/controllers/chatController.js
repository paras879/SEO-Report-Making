const { pool } = require('../config/db');

// ---- permission: who can chat with whom ----
// Rules:
//  - super_admin -> ONLY admins (aur koi nahi)
//  - admin       -> everyone (super_admin, admins, team_leads, employees)
//  - team_lead   -> admins + own-team employees   (super_admin NOT shown)
//  - employee    -> own team lead + admins          (super_admin NOT shown)
function canChat(me, other) {
  if (!other || me.id === other.id) return false;
  // super_admin sirf admin se
  if (me.role === 'super_admin') return other.role === 'admin';
  if (other.role === 'super_admin') return me.role === 'admin';
  // admin sabse (super handled above)
  if (me.role === 'admin' || other.role === 'admin') return true;
  // developer <-> team_lead or admin
  if (me.role === 'developer' && ['team_lead', 'admin'].includes(other.role)) return true;
  if (other.role === 'developer' && ['team_lead', 'admin'].includes(me.role)) return true;
  // team_lead <-> apni team ke employee
  if (me.role === 'team_lead' && other.role === 'employee' && other.team_id && other.team_id === me.team_id) return true;
  if (me.role === 'employee' && other.role === 'team_lead' && other.team_id && other.team_id === me.team_id) return true;
  return false;
}

// allowed contacts ka SQL condition (u = users alias)
function contactCondition(me, params) {
  if (me.role === 'admin') {
    return 'TRUE'; // sab
  }
  if (me.role === 'super_admin') {
    return "u.role = 'admin'"; // sirf admins
  }
  if (me.role === 'developer') {
    return "u.role IN ('admin', 'team_lead')";
  }
  if (me.role === 'team_lead') {
    params.push(me.team_id);
    return `(u.role IN ('admin', 'developer') OR (u.role='employee' AND u.team_id = $${params.length}))`;
  }
  // employee
  params.push(me.team_id);
  return `(u.role='admin' OR (u.role='team_lead' AND u.team_id = $${params.length}))`;
}


// GET /api/chat/contacts   -> allowed users + last message + unread
async function contacts(req, res, next) {
  try {
    const me = req.user;
    const params = [me.id];           // $1 = me
    const cond = contactCondition(me, params); // may push more params
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.username, u.role, u.is_active,
        (SELECT m.body FROM messages m
          WHERE (m.sender_id=u.id AND m.receiver_id=$1) OR (m.sender_id=$1 AND m.receiver_id=u.id)
          ORDER BY m.created_at DESC LIMIT 1) AS last_message,
        (SELECT m.created_at FROM messages m
          WHERE (m.sender_id=u.id AND m.receiver_id=$1) OR (m.sender_id=$1 AND m.receiver_id=u.id)
          ORDER BY m.created_at DESC LIMIT 1) AS last_at,
        (SELECT COUNT(*)::int FROM messages m
          WHERE m.sender_id=u.id AND m.receiver_id=$1 AND m.is_read=FALSE) AS unread
      FROM users u
      WHERE u.is_active AND u.id <> $1 AND ${cond}
      ORDER BY last_at DESC NULLS LAST, u.name ASC`,
      params
    );
    res.json({ success: true, contacts: rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/chat/:userId/messages  -> conversation (with delta sync support)
async function conversation(req, res, next) {
  try {
    const me = req.user;
    const otherId = Number(req.params.userId);
    const sinceId = req.query.since_id ? Number(req.query.since_id) : 0;

    const o = await pool.query('SELECT id, name, username, role, team_id, is_active FROM users WHERE id=$1', [otherId]);
    const other = o.rows[0];
    if (!other) return res.status(404).json({ success: false, message: 'User not found' });
    if (!canChat(me, other)) return res.status(403).json({ success: false, message: 'You cannot chat with this user' });

    let sql = `
      SELECT id, sender_id, receiver_id, body, is_read, created_at FROM messages
      WHERE ((sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1))
    `;
    const params = [me.id, otherId];

    if (sinceId > 0) {
      sql += ` AND id > $3 ORDER BY created_at ASC LIMIT 100`;
      params.push(sinceId);
    } else {
      sql += ` ORDER BY created_at ASC LIMIT 300`;
    }

    const { rows } = await pool.query(sql, params);

    // mark unread messages as read
    await pool.query('UPDATE messages SET is_read=TRUE WHERE sender_id=$1 AND receiver_id=$2 AND is_read=FALSE', [otherId, me.id]);

    res.json({
      success: true,
      contact: { id: other.id, name: other.name, username: other.username, role: other.role },
      messages: rows,
      isDelta: sinceId > 0,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/chat/:userId  { body }  -> message bhejo
async function sendMessage(req, res, next) {
  try {
    const me = req.user;
    const otherId = Number(req.params.userId);
    const body = String(req.body.body || '').trim();
    if (!body) return res.status(422).json({ success: false, message: 'Message cannot be empty' });
    if (body.length > 4000) return res.status(422).json({ success: false, message: 'Message is too long' });

    const o = await pool.query('SELECT id, name, role, team_id, is_active FROM users WHERE id=$1', [otherId]);
    const other = o.rows[0];
    if (!other || !other.is_active) return res.status(404).json({ success: false, message: 'User not found' });
    if (!canChat(me, other)) return res.status(403).json({ success: false, message: 'You cannot chat with this user' });

    const { rows } = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, body) VALUES ($1,$2,$3)
       RETURNING id, sender_id, receiver_id, body, is_read, created_at`,
      [me.id, otherId, body]
    );
    res.status(201).json({ success: true, message: rows[0] });
  } catch (err) {
    next(err);
  }
}

// GET /api/chat/unread-count  -> total unread (badge ke liye)
async function unreadCount(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS count FROM messages WHERE receiver_id=$1 AND is_read=FALSE',
      [req.user.id]
    );
    res.json({ success: true, count: rows[0].count });
  } catch (err) {
    next(err);
  }
}

module.exports = { contacts, conversation, sendMessage, unreadCount };
