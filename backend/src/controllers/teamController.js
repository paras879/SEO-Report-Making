const { pool } = require('../config/db');
const { logAudit } = require('../utils/audit');

// POST /api/teams   (admin / super_admin)
async function createTeam(req, res, next) {
  try {
    const { name, description, team_lead_id } = req.body;

    if (team_lead_id) {
      const tl = await pool.query("SELECT id, role FROM users WHERE id = $1", [team_lead_id]);
      if (!tl.rows[0] || tl.rows[0].role !== 'team_lead') {
        return res.status(422).json({ success: false, message: 'team_lead_id must be a valid team_lead user' });
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO teams (name, description, team_lead_id, created_by)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, description || null, team_lead_id || null, req.user.id]
    );
    const team = rows[0];

    // TL ko is team se link karo
    if (team_lead_id) {
      await pool.query('UPDATE users SET team_id = $1 WHERE id = $2', [team.id, team_lead_id]);
    }
    await logAudit({ userId: req.user.id, action: 'team_created', entityType: 'team', entityId: team.id, req });
    res.status(201).json({ success: true, team });
  } catch (err) {
    next(err);
  }
}

// GET /api/teams   (admin/super_admin: all; team_lead: apni team)
async function listTeams(req, res, next) {
  try {
    let sql = `
      SELECT t.*,
             u.name AS team_lead_name,
             u.email AS team_lead_email,
             u.username AS team_lead_username,
             (SELECT COUNT(*) FROM users e WHERE e.team_id = t.id AND e.role = 'employee') AS employee_count,
             (SELECT json_agg(json_build_object('id', e.id, 'name', e.name, 'username', e.username)) 
              FROM (SELECT id, name, username FROM users WHERE team_id = t.id AND role = 'employee' LIMIT 5) e
             ) AS member_previews
      FROM teams t
      LEFT JOIN users u ON u.id = t.team_lead_id`;
    const params = [];
    if (req.user.role === 'team_lead') {
      sql += ` WHERE t.team_lead_id = $1`;
      params.push(req.user.id);
    }
    sql += ` ORDER BY t.created_at DESC`;
    const { rows } = await pool.query(sql, params);
    res.json({ success: true, count: rows.length, teams: rows });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/teams/:id (admin / super_admin)
async function deleteTeam(req, res, next) {
  try {
    const { id } = req.params;
    // Unassign all users from this team first
    await pool.query('UPDATE users SET team_id = NULL WHERE team_id = $1', [id]);
    const { rowCount } = await pool.query('DELETE FROM teams WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ success: false, message: 'Team not found' });
    await logAudit({ userId: req.user.id, action: 'team_deleted', entityType: 'team', entityId: Number(id), req });
    res.json({ success: true, message: 'Team deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// GET /api/teams/:id   (members ke saath)
async function getTeam(req, res, next) {
  try {
    const t = await pool.query(
      `SELECT t.*, u.name AS team_lead_name FROM teams t
       LEFT JOIN users u ON u.id = t.team_lead_id WHERE t.id = $1`,
      [req.params.id]
    );
    if (!t.rows[0]) return res.status(404).json({ success: false, message: 'Team not found' });

    // team lead sirf apni team dekhe
    if (req.user.role === 'team_lead' && t.rows[0].team_lead_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const members = await pool.query(
      `SELECT id, name, email, username, role, is_active FROM users
       WHERE team_id = $1 AND role = 'employee' ORDER BY name`,
      [req.params.id]
    );
    res.json({ success: true, team: t.rows[0], members: members.rows });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/teams/:id
async function updateTeam(req, res, next) {
  try {
    const { name, description, team_lead_id, is_active } = req.body;
    const fields = [];
    const params = [];
    let i = 1;
    if (name !== undefined) { fields.push(`name = $${i++}`); params.push(name); }
    if (description !== undefined) { fields.push(`description = $${i++}`); params.push(description); }
    if (is_active !== undefined) { fields.push(`is_active = $${i++}`); params.push(is_active); }
    if (team_lead_id !== undefined) { fields.push(`team_lead_id = $${i++}`); params.push(team_lead_id); }
    if (fields.length === 0) return res.status(400).json({ success: false, message: 'Nothing to update' });

    params.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE teams SET ${fields.join(', ')}, updated_at = now() WHERE id = $${i} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Team not found' });

    if (team_lead_id) {
      await pool.query('UPDATE users SET team_id = $1 WHERE id = $2', [req.params.id, team_lead_id]);
    }
    await logAudit({ userId: req.user.id, action: 'team_updated', entityType: 'team', entityId: Number(req.params.id), req });
    res.json({ success: true, team: rows[0] });
  } catch (err) {
    next(err);
  }
}

// POST /api/teams/:id/members   { user_id }  -> employee ko team me add
async function addMember(req, res, next) {
  try {
    const { user_id } = req.body;
    const u = await pool.query("SELECT id, role FROM users WHERE id = $1", [user_id]);
    if (!u.rows[0] || u.rows[0].role !== 'employee') {
      return res.status(422).json({ success: false, message: 'Only employees can be added as members' });
    }
    const { rows } = await pool.query(
      `UPDATE users SET team_id = $1, updated_at = now() WHERE id = $2
       RETURNING id, name, username, role, team_id`,
      [req.params.id, user_id]
    );
    await logAudit({ userId: req.user.id, action: 'member_added', entityType: 'team', entityId: Number(req.params.id), details: { user_id }, req });
    res.json({ success: true, member: rows[0] });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/teams/:id/members/:userId  -> employee ko team se hatao
async function removeMember(req, res, next) {
  try {
    await pool.query(
      `UPDATE users SET team_id = NULL, updated_at = now() WHERE id = $1 AND team_id = $2`,
      [req.params.userId, req.params.id]
    );
    await logAudit({ userId: req.user.id, action: 'member_removed', entityType: 'team', entityId: Number(req.params.id), details: { user_id: req.params.userId }, req });
    res.json({ success: true, message: 'Member removed from team' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createTeam, listTeams, getTeam, updateTeam, deleteTeam, addMember, removeMember };
