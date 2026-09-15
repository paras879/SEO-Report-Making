const { pool } = require('../config/db');

// GET /api/dashboard/stats   role ke hisaab se summary
async function stats(req, res, next) {
  try {
    const role = req.user.role;
    const out = {};

    if (role === 'super_admin') {
      const q = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM users WHERE role='admin') AS admins,
          (SELECT COUNT(*) FROM users WHERE role='team_lead') AS team_leads,
          (SELECT COUNT(*) FROM users WHERE role='employee') AS employees,
          (SELECT COUNT(*) FROM teams) AS teams,
          (SELECT COUNT(*) FROM reports) AS total_reports,
          (SELECT COUNT(*) FROM reports WHERE status='submitted') AS pending_tl,
          (SELECT COUNT(*) FROM reports WHERE status='forwarded') AS pending_admin,
          (SELECT COUNT(*) FROM reports WHERE status='admin_approved') AS approved
      `);
      out.summary = q.rows[0];
    } else if (role === 'admin') {
      const q = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM reports WHERE status='forwarded') AS pending_admin,
          (SELECT COUNT(*) FROM reports WHERE status='admin_approved') AS approved,
          (SELECT COUNT(*) FROM reports WHERE status='admin_rejected') AS returned,
          (SELECT COUNT(*) FROM teams) AS teams
      `);
      out.summary = q.rows[0];
    } else if (role === 'team_lead') {
      const q = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM reports WHERE team_lead_id=$1 AND status='submitted') AS pending_review,
          (SELECT COUNT(*) FROM reports WHERE team_lead_id=$1 AND status='forwarded') AS forwarded,
          (SELECT COUNT(*) FROM reports WHERE team_lead_id=$1 AND status='admin_approved') AS approved,
          (SELECT COUNT(*) FROM users WHERE team_id=(SELECT team_id FROM users WHERE id=$1) AND role='employee') AS my_employees
      `, [req.user.id]);
      out.summary = q.rows[0];
    } else {
      const q = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status='draft') AS drafts,
          COUNT(*) FILTER (WHERE status='submitted') AS submitted,
          COUNT(*) FILTER (WHERE status='tl_rejected') AS returned,
          COUNT(*) FILTER (WHERE status='admin_approved') AS approved,
          COUNT(*) AS total
        FROM reports WHERE employee_id=$1
      `, [req.user.id]);
      out.summary = q.rows[0];
    }
    res.json({ success: true, ...out });
  } catch (err) {
    next(err);
  }
}

// GET /api/dashboard/charts   -> status breakdown + last 7 days (role-scoped)
async function charts(req, res, next) {
  try {
    const role = req.user.role;
    // role scope
    let scope = '';
    const params = [];
    if (role === 'employee') { scope = 'WHERE employee_id = $1'; params.push(req.user.id); }
    else if (role === 'team_lead') { scope = 'WHERE team_lead_id = $1'; params.push(req.user.id); }
    else if (role === 'admin') { scope = "WHERE status IN ('forwarded','admin_approved','admin_rejected')"; }
    // super_admin -> all

    const byStatus = await pool.query(
      `SELECT status, COUNT(*)::int AS count FROM reports ${scope} GROUP BY status`, params
    );

    // last 7 days (report count per day)
    const dayScope = scope ? scope + ' AND ' : 'WHERE ';
    const last7 = await pool.query(
      `SELECT report_date::date AS day, COUNT(*)::int AS count
       FROM reports ${dayScope} report_date >= (CURRENT_DATE - INTERVAL '6 days')
       GROUP BY day ORDER BY day`, params
    );

    res.json({ success: true, byStatus: byStatus.rows, last7: last7.rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/dashboard/chain/:reportId   (super_admin) -> poori chain, kisne kya bheja
async function reportChain(req, res, next) {
  try {
    const r = await pool.query(
      `SELECT r.*, e.name AS employee_name, tl.name AS team_lead_name, t.name AS team_name
       FROM reports r
       LEFT JOIN users e ON e.id=r.employee_id
       LEFT JOIN users tl ON tl.id=r.team_lead_id
       LEFT JOIN teams t ON t.id=r.team_id
       WHERE r.id=$1`, [req.params.reportId]
    );
    if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Report not found' });
    const actions = await pool.query(
      `SELECT ra.*, u.name AS action_by_name FROM report_actions ra
       LEFT JOIN users u ON u.id=ra.action_by WHERE ra.report_id=$1 ORDER BY ra.created_at ASC`,
      [req.params.reportId]
    );
    res.json({ success: true, report: r.rows[0], chain: actions.rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/dashboard/audit   (super_admin) -> audit logs  ?limit=
async function auditLogs(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const { rows } = await pool.query(
      `SELECT al.*, u.name AS user_name, u.role AS user_role FROM audit_logs al
       LEFT JOIN users u ON u.id=al.user_id ORDER BY al.created_at DESC LIMIT $1`,
      [limit]
    );
    res.json({ success: true, count: rows.length, logs: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { stats, charts, reportChain, auditLogs };
