const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { logAudit } = require('../utils/audit');
const { checkPasswordStrength } = require('../utils/password');
const { BCRYPT_ROUNDS } = require('../config/security');

// kaun kaunse role bana sakta hai
const CREATE_MATRIX = {
  super_admin: ['admin', 'team_lead', 'employee', 'developer', 'designer', 'editor', 'supervisor'],
  admin: ['team_lead', 'employee', 'developer', 'designer', 'editor', 'supervisor'],
};

const PUBLIC_COLS =
  'id, name, email, username, role, team_id, is_active, must_change_password, last_login_at, created_at';

// POST /api/users   (admin / super_admin)
async function createUser(req, res, next) {
  const client = await pool.connect();
  try {
    const { name, email, username, password, role, team_id } = req.body;
    const creatorRole = req.user.role;

    const allowed = CREATE_MATRIX[creatorRole] || [];
    if (!allowed.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `${creatorRole} cannot create a '${role}' account`,
      });
    }

    // employee ko team chahiye
    if (role === 'employee' && !team_id) {
      return res.status(422).json({ success: false, message: 'team_id is required for an employee' });
    }

    const strength = checkPasswordStrength(password);
    if (!strength.ok) return res.status(422).json({ success: false, message: strength.message });

    await client.query('BEGIN');

    // team exist karti hai?
    if (team_id) {
      const t = await client.query('SELECT id FROM teams WHERE id = $1 AND is_active = TRUE', [team_id]);
      if (t.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Team not found' });
      }
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { rows } = await client.query(
      `INSERT INTO users (name, email, username, password_hash, role, team_id, created_by, must_change_password)
       VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE) RETURNING ${PUBLIC_COLS}`,
      [name, String(email).toLowerCase(), username, hash, role, role === 'employee' ? team_id : null, req.user.id]
    );
    const newUser = rows[0];

    // agar team_lead bana aur team_id diya -> us team ka lead set kar do
    if (role === 'team_lead' && team_id) {
      await client.query('UPDATE teams SET team_lead_id = $1, updated_at = now() WHERE id = $2', [
        newUser.id,
        team_id,
      ]);
      await client.query('UPDATE users SET team_id = $1 WHERE id = $2', [team_id, newUser.id]);
      newUser.team_id = team_id;
    }

    await client.query('COMMIT');
    await logAudit({
      userId: req.user.id,
      action: 'user_created',
      entityType: 'user',
      entityId: newUser.id,
      details: { role, team_id },
      req,
    });

    res.status(201).json({ success: true, user: newUser });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

// GET /api/users   (admin / super_admin)  ?role=&team_id=&q=
async function listUsers(req, res, next) {
  try {
    const { role, team_id, q } = req.query;
    const conds = [];
    const params = [];
    let i = 1;

    // admin super_admin ko na dekhe (super_admin sabko dekhe)
    if (req.user.role === 'admin') {
      conds.push(`role <> 'super_admin'`);
    }
    if (role) { conds.push(`role::text = $${i++}`); params.push(role); }
    if (team_id) { conds.push(`team_id = $${i++}`); params.push(team_id); }
    if (q) { conds.push(`(name ILIKE $${i} OR email ILIKE $${i} OR username ILIKE $${i})`); params.push(`%${q}%`); i++; }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT ${PUBLIC_COLS} FROM users ${where} ORDER BY created_at DESC`,
      params
    );
    res.json({ success: true, count: rows.length, users: rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/:id
async function getUser(req, res, next) {
  try {
    const { rows } = await pool.query(`SELECT ${PUBLIC_COLS} FROM users WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    next(err);
  }
}

// higher-role protection: admin higher/equal ko na chhede, na khud ko deactivate kare
async function guardTarget(req, res) {
  const t = await pool.query('SELECT id, role FROM users WHERE id = $1', [req.params.id]);
  const target = t.rows[0];
  if (!target) { res.status(404).json({ success: false, message: 'User not found' }); return null; }
  if (req.user.role === 'admin' && ['super_admin', 'admin'].includes(target.role)) {
    res.status(403).json({ success: false, message: 'Admin cannot modify Super Admin or another Admin' });
    return null;
  }
  if (Number(req.params.id) === req.user.id && req.body.is_active === false) {
    res.status(400).json({ success: false, message: 'You cannot deactivate yourself' });
    return null;
  }
  return target;
}

// PATCH /api/users/:id   (name, email, username, role, is_active, team_id)
async function updateUser(req, res, next) {
  try {
    if (!(await guardTarget(req, res))) return;
    const { name, email, username, role, is_active, team_id } = req.body;
    const fields = [];
    const params = [];
    let i = 1;
    if (name !== undefined) { fields.push(`name = $${i++}`); params.push(name.trim()); }
    if (email !== undefined) { fields.push(`email = $${i++}`); params.push(String(email).toLowerCase().trim()); }
    if (username !== undefined) { fields.push(`username = $${i++}`); params.push(username.trim()); }
    if (role !== undefined) {
      if (req.user.role === 'admin' && ['super_admin', 'admin'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Admin cannot assign Super Admin or Admin role' });
      }
      fields.push(`role = $${i++}`);
      params.push(role);
    }
    if (is_active !== undefined) {
      fields.push(`is_active = $${i++}`);
      params.push(is_active);
      if (is_active === true) {
        fields.push(`failed_attempts = 0`);
        fields.push(`locked_until = NULL`);
      }
    }
    if (team_id !== undefined) {
      fields.push(`team_id = $${i++}`);
      params.push(team_id ? Number(team_id) : null);
    }
    if (fields.length === 0) return res.status(400).json({ success: false, message: 'Nothing to update' });

    params.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = now() WHERE id = $${i} RETURNING ${PUBLIC_COLS}`,
      params
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'User not found' });

    // if user was made team_lead of a team -> update team table
    if (role === 'team_lead' && team_id) {
      await pool.query('UPDATE teams SET team_lead_id = $1, updated_at = now() WHERE id = $2', [rows[0].id, team_id]);
    }

    // deactivate -> tokens revoke
    if (is_active === false) {
      await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1', [req.params.id]);
    }
    await logAudit({ userId: req.user.id, action: 'user_updated', entityType: 'user', entityId: Number(req.params.id), details: req.body, req });
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    next(err);
  }
}


// POST /api/users/:id/reset-password   { newPassword }
async function resetPassword(req, res, next) {
  try {
    if (!(await guardTarget(req, res))) return;
    const { newPassword } = req.body;
    const strength = checkPasswordStrength(newPassword);
    if (!strength.ok) return res.status(422).json({ success: false, message: strength.message });
    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const { rowCount } = await pool.query(
      'UPDATE users SET password_hash = $1, must_change_password = TRUE, updated_at = now() WHERE id = $2',
      [hash, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ success: false, message: 'User not found' });
    await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1', [req.params.id]);
    await logAudit({ userId: req.user.id, action: 'password_reset', entityType: 'user', entityId: Number(req.params.id), req });
    res.json({ success: true, message: 'Password reset. User must change it on next login.' });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/users/:id (admin / super_admin)
async function deleteUser(req, res, next) {
  try {
    if (!(await guardTarget(req, res))) return;
    const targetId = Number(req.params.id);
    if (targetId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [targetId]);
    const target = rows[0];
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });

    if (target.role === 'super_admin') {
      return res.status(403).json({ success: false, message: 'Super admin account cannot be deleted' });
    }

    // Clear team_lead_id if target is lead of any team
    await pool.query('UPDATE teams SET team_lead_id = NULL WHERE team_lead_id = $1', [targetId]);

    // Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [targetId]);
    await logAudit({
      userId: req.user.id,
      action: 'user_deleted',
      entityType: 'user',
      entityId: targetId,
      details: { username: target.username, role: target.role },
      req,
    });

    res.json({ success: true, message: `User "${target.username}" deleted successfully` });
  } catch (err) {
    next(err);
  }
}

module.exports = { createUser, listUsers, getUser, updateUser, resetPassword, deleteUser };
