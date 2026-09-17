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
          (SELECT COUNT(*) FROM users WHERE role='developer') AS developers,
          (SELECT COUNT(*) FROM teams) AS teams,
          (SELECT COUNT(*) FROM reports) AS total_reports,
          (SELECT COUNT(*) FROM reports WHERE status='submitted') AS pending_tl,
          (SELECT COUNT(*) FROM reports WHERE status='forwarded') AS pending_admin,
          (SELECT COUNT(*) FROM reports WHERE status='admin_approved') AS approved,
          (SELECT COUNT(*) FROM dev_requests WHERE status NOT IN ('resolved')) AS open_dev_tickets,
          (SELECT COUNT(*) FROM dev_requests WHERE status='resolved') AS resolved_dev_tickets
      `);
      out.summary = q.rows[0];
    } else if (role === 'admin') {
      const q = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM reports WHERE status='forwarded') AS pending_admin,
          (SELECT COUNT(*) FROM reports WHERE status='admin_approved') AS approved,
          (SELECT COUNT(*) FROM reports WHERE status='admin_rejected') AS returned,
          (SELECT COUNT(*) FROM reports) AS total_reports,
          (SELECT COUNT(*) FROM teams) AS teams,
          (SELECT COUNT(*) FROM users WHERE role IN ('employee', 'team_lead', 'developer')) AS team_members,
          (SELECT COUNT(*) FROM dev_requests WHERE status NOT IN ('resolved')) AS open_dev_tickets,
          (SELECT COUNT(*) FROM dev_requests WHERE status='resolved') AS resolved_dev_tickets
      `);
      out.summary = q.rows[0];
    } else if (role === 'team_lead') {
      const q = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM reports WHERE team_lead_id=$1 AND status='submitted') AS pending_review,
          (SELECT COUNT(*) FROM reports WHERE team_lead_id=$1 AND status='forwarded') AS forwarded,
          (SELECT COUNT(*) FROM reports WHERE team_lead_id=$1 AND status='admin_approved') AS approved,
          (SELECT COUNT(*) FROM users WHERE team_id=(SELECT team_id FROM users WHERE id=$1) AND role='employee') AS my_employees,
          (SELECT COUNT(*) FROM dev_requests WHERE team_lead_id=$1 AND status NOT IN ('resolved')) AS open_dev_tickets
      `, [req.user.id]);
      out.summary = q.rows[0];
    } else if (role === 'developer') {
      const q = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status IN ('forwarded','in_progress','under_qa','reopened')) AS pending,
          COUNT(*) FILTER (WHERE status='in_progress') AS in_progress,
          COUNT(*) FILTER (WHERE status='under_qa') AS under_qa,
          COUNT(*) FILTER (WHERE status='resolved') AS resolved,
          COALESCE(SUM(hours_spent), 0) AS total_hours_spent,
          COUNT(*) AS total_assigned
        FROM dev_requests WHERE developer_id=$1
      `, [req.user.id]);
      out.summary = q.rows[0];
    } else {
      const q = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status='draft') AS drafts,
          COUNT(*) FILTER (WHERE status='submitted') AS submitted,
          COUNT(*) FILTER (WHERE status='tl_rejected') AS returned,
          COUNT(*) FILTER (WHERE status='admin_approved') AS approved,
          COUNT(*) AS total,
          (SELECT COUNT(*) FROM dev_requests WHERE employee_id=$1 AND status NOT IN ('resolved')) AS open_dev_tickets,
          (SELECT t.name FROM users u LEFT JOIN teams t ON t.id = u.team_id WHERE u.id = $1) AS team_name,
          (SELECT tl.name FROM users u LEFT JOIN teams t ON t.id = u.team_id LEFT JOIN users tl ON tl.id = t.team_lead_id WHERE u.id = $1) AS team_lead_name
        FROM reports WHERE employee_id=$1
      `, [req.user.id]);
      out.summary = q.rows[0];

      // Fetch employee's recent reports
      const rec = await pool.query(`
        SELECT id, title, report_date, status, client_name, website_url, created_at
        FROM reports WHERE employee_id=$1 ORDER BY created_at DESC LIMIT 5
      `, [req.user.id]);
      out.recent_reports = rec.rows;
    }

    res.json({ success: true, ...out });
  } catch (err) {
    next(err);
  }
}

// Helper function to build date conditions
function getDateCondition(query, dateColumn = 'report_date') {
  const { range, from, to } = query;
  if (range === 'today') {
    return { sql: `${dateColumn} = CURRENT_DATE`, params: [] };
  } else if (range === 'yesterday') {
    return { sql: `${dateColumn} = (CURRENT_DATE - INTERVAL '1 day')::date`, params: [] };
  } else if (range === '7d') {
    return { sql: `${dateColumn} >= (CURRENT_DATE - INTERVAL '6 days')::date AND ${dateColumn} <= CURRENT_DATE`, params: [] };
  } else if (range === '30d') {
    return { sql: `${dateColumn} >= (CURRENT_DATE - INTERVAL '29 days')::date AND ${dateColumn} <= CURRENT_DATE`, params: [] };
  } else if (range === 'custom' && from && to) {
    return { sql: `${dateColumn} >= $FROM_PARAM AND ${dateColumn} <= $TO_PARAM`, custom: { from, to } };
  }
  return null;
}

// GET /api/dashboard/charts   -> status breakdown + trend (role-scoped + date filter)
async function charts(req, res, next) {
  try {
    const role = req.user.role;
    const { range = '7d', from, to } = req.query;

    // Role-based scope
    let roleConditions = [];
    const baseParams = [];
    let paramIdx = 1;

    if (role === 'employee') {
      roleConditions.push(`employee_id = $${paramIdx++}`);
      baseParams.push(req.user.id);
    } else if (role === 'team_lead') {
      roleConditions.push(`team_lead_id = $${paramIdx++}`);
      baseParams.push(req.user.id);
    } else if (role === 'admin') {
      roleConditions.push(`status IN ('forwarded','admin_approved','admin_rejected')`);
    } else if (role === 'developer') {
      roleConditions.push(`employee_id = -1`); // developer has no direct reports
    }

    // Date filtering for byStatus
    const dateCond = getDateCondition(req.query, 'report_date');
    let statusConditions = [...roleConditions];
    let statusParams = [...baseParams];

    if (dateCond) {
      if (dateCond.custom) {
        statusConditions.push(`report_date >= $${paramIdx++} AND report_date <= $${paramIdx++}`);
        statusParams.push(dateCond.custom.from, dateCond.custom.to);
      } else {
        statusConditions.push(dateCond.sql);
      }
    }

    const statusWhere = statusConditions.length ? `WHERE ${statusConditions.join(' AND ')}` : '';
    const byStatus = await pool.query(
      `SELECT status, COUNT(*)::int AS count FROM reports ${statusWhere} GROUP BY status`,
      statusParams
    );

    // Trend / Daily Volume series
    let trendWhere = [...roleConditions];
    let trendParams = [...baseParams];
    let tIdx = paramIdx;

    if (range === 'today') {
      trendWhere.push(`report_date = CURRENT_DATE`);
    } else if (range === 'yesterday') {
      trendWhere.push(`report_date = (CURRENT_DATE - INTERVAL '1 day')::date`);
    } else if (range === '30d') {
      trendWhere.push(`report_date >= (CURRENT_DATE - INTERVAL '29 days')::date AND report_date <= CURRENT_DATE`);
    } else if (range === 'custom' && from && to) {
      trendWhere.push(`report_date >= $${tIdx++} AND report_date <= $${tIdx++}`);
      trendParams.push(from, to);
    } else {
      // default 7 days
      trendWhere.push(`report_date >= (CURRENT_DATE - INTERVAL '6 days')::date AND report_date <= CURRENT_DATE`);
    }

    const trendWhereClause = trendWhere.length ? `WHERE ${trendWhere.join(' AND ')}` : '';
    const trendQuery = await pool.query(
      `SELECT report_date::date AS day, COUNT(*)::int AS count
       FROM reports ${trendWhereClause}
       GROUP BY day ORDER BY day ASC`,
      trendParams
    );

    res.json({
      success: true,
      range,
      byStatus: byStatus.rows,
      last7: trendQuery.rows,
      trend: trendQuery.rows,
    });
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
