const { pool } = require('../config/db');

// GET /api/dashboard/stats   role ke hisaab se summary
async function stats(req, res, next) {
  try {
    const role = req.user.role;
    const out = {};

    if (['super_admin', 'supervisor'].includes(role)) {
      const q = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM users WHERE role='admin') AS admins,
          (SELECT COUNT(*) FROM users WHERE role='team_lead') AS team_leads,
          (SELECT COUNT(*) FROM users WHERE role='employee') AS employees,
          (SELECT COUNT(*) FROM users WHERE role='developer') AS developers,
          (SELECT COUNT(*) FROM users WHERE role::text IN ('designer','editor')) AS editors,
          (SELECT COUNT(*) FROM teams) AS teams,
          (SELECT COUNT(*) FROM reports) AS total_reports,
          (SELECT COUNT(*) FROM reports WHERE status='submitted') AS pending_tl,
          (SELECT COUNT(*) FROM reports WHERE status='forwarded') AS pending_admin,
          (SELECT COUNT(*) FROM reports WHERE status='admin_approved') AS approved,
          (SELECT COUNT(*) FROM dev_requests WHERE status NOT IN ('resolved')) AS open_dev_tickets,
          (SELECT COUNT(*) FROM dev_requests WHERE status='resolved') AS resolved_dev_tickets,
          (SELECT COUNT(*) FROM design_requests WHERE status NOT IN ('resolved')) AS open_design_tickets,
          (SELECT COUNT(*) FROM design_requests WHERE status='resolved') AS resolved_design_tickets
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
        FROM dev_requests WHERE developer_id=$1 OR developer_id IS NULL
      `, [req.user.id]);
      out.summary = q.rows[0];

      const rec = await pool.query(`
        SELECT r.id, r.title, r.category, r.priority, r.status, r.client_name, r.created_at, e.name AS employee_name
        FROM dev_requests r
        LEFT JOIN users e ON e.id=r.employee_id
        WHERE (r.developer_id=$1 OR r.developer_id IS NULL) AND r.status NOT IN ('resolved')
        ORDER BY r.updated_at DESC LIMIT 6
      `, [req.user.id]);
      out.recent_reports = rec.rows;
    } else if (role === 'designer') {
      const q = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status IN ('forwarded','in_progress','under_qa','reopened')) AS pending,
          COUNT(*) FILTER (WHERE status='in_progress') AS in_progress,
          COUNT(*) FILTER (WHERE status='under_qa') AS under_qa,
          COUNT(*) FILTER (WHERE status='resolved') AS resolved,
          COALESCE(SUM(hours_spent), 0) AS total_hours_spent,
          COUNT(*) AS total_assigned
        FROM design_requests WHERE designer_id=$1 OR designer_id IS NULL
      `, [req.user.id]);
      out.summary = q.rows[0];

      const rec = await pool.query(`
        SELECT r.id, r.title, r.category, r.blog_category, r.keywords, r.priority, r.status, r.client_name, r.created_at, e.name AS employee_name
        FROM design_requests r
        LEFT JOIN users e ON e.id=r.employee_id
        WHERE (r.designer_id=$1 OR r.designer_id IS NULL) AND r.status NOT IN ('resolved')
        ORDER BY r.updated_at DESC LIMIT 6
      `, [req.user.id]);
      out.recent_reports = rec.rows;
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
    const { range = '7d' } = req.query;

    let byStatus = [];
    const trendMap = {};

    // Generate last 7 days array as YYYY-MM-DD
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      last7Days.push(dayStr);
      trendMap[dayStr] = 0;
    }

    if (['supervisor', 'super_admin', 'admin'].includes(role)) {
      // 1. Fetch report status counts
      const rStatus = await pool.query(
        `SELECT status, COUNT(*)::int AS count FROM reports GROUP BY status`
      );
      // 2. Fetch dev requests status counts
      const devStatus = await pool.query(
        `SELECT status, COUNT(*)::int AS count FROM dev_requests GROUP BY status`
      );
      // 3. Fetch design requests status counts
      const desStatus = await pool.query(
        `SELECT status, COUNT(*)::int AS count FROM design_requests GROUP BY status`
      );

      const map = {
        'Approved & Resolved': 0,
        'In Progress': 0,
        'Pending Review': 0,
        'Draft': 0,
      };

      rStatus.rows.forEach((r) => {
        if (r.status === 'admin_approved') map['Approved & Resolved'] += r.count;
        else if (['forwarded', 'submitted'].includes(r.status)) map['Pending Review'] += r.count;
        else map['Draft'] += r.count;
      });

      devStatus.rows.forEach((d) => {
        if (d.status === 'resolved') map['Approved & Resolved'] += d.count;
        else if (['in_progress', 'under_qa'].includes(d.status)) map['In Progress'] += d.count;
        else map['Pending Review'] += d.count;
      });

      desStatus.rows.forEach((d) => {
        if (d.status === 'resolved') map['Approved & Resolved'] += d.count;
        else if (['in_progress', 'under_qa'].includes(d.status)) map['In Progress'] += d.count;
        else map['Pending Review'] += d.count;
      });

      byStatus = Object.keys(map).map((k) => ({ status: k, count: map[k] }));

      // Daily trend across all modules for last 7 days
      const rTrend = await pool.query(
        `SELECT report_date::date::text AS day, COUNT(*)::int AS count FROM reports WHERE report_date >= (CURRENT_DATE - INTERVAL '6 days')::date GROUP BY day`
      );
      rTrend.rows.forEach((r) => {
        if (trendMap[r.day] !== undefined) trendMap[r.day] += r.count;
      });

      const devTrend = await pool.query(
        `SELECT created_at::date::text AS day, COUNT(*)::int AS count FROM dev_requests WHERE created_at >= (CURRENT_DATE - INTERVAL '6 days')::date GROUP BY day`
      );
      devTrend.rows.forEach((d) => {
        if (trendMap[d.day] !== undefined) trendMap[d.day] += d.count;
      });

      const desTrend = await pool.query(
        `SELECT created_at::date::text AS day, COUNT(*)::int AS count FROM design_requests WHERE created_at >= (CURRENT_DATE - INTERVAL '6 days')::date GROUP BY day`
      );
      desTrend.rows.forEach((d) => {
        if (trendMap[d.day] !== undefined) trendMap[d.day] += d.count;
      });
    } else if (role === 'developer') {
      const devStatus = await pool.query(
        `SELECT status, COUNT(*)::int AS count FROM dev_requests WHERE developer_id=$1 OR developer_id IS NULL GROUP BY status`,
        [req.user.id]
      );
      byStatus = devStatus.rows;

      const devTrend = await pool.query(
        `SELECT created_at::date::text AS day, COUNT(*)::int AS count FROM dev_requests WHERE (developer_id=$1 OR developer_id IS NULL) AND created_at >= (CURRENT_DATE - INTERVAL '6 days')::date GROUP BY day`,
        [req.user.id]
      );
      devTrend.rows.forEach((d) => {
        if (trendMap[d.day] !== undefined) trendMap[d.day] += d.count;
      });
    } else if (role === 'designer' || role === 'editor') {
      const desStatus = await pool.query(
        `SELECT status, COUNT(*)::int AS count FROM design_requests WHERE designer_id=$1 OR designer_id IS NULL GROUP BY status`,
        [req.user.id]
      );
      byStatus = desStatus.rows;

      const desTrend = await pool.query(
        `SELECT created_at::date::text AS day, COUNT(*)::int AS count FROM design_requests WHERE (designer_id=$1 OR designer_id IS NULL) AND created_at >= (CURRENT_DATE - INTERVAL '6 days')::date GROUP BY day`,
        [req.user.id]
      );
      desTrend.rows.forEach((d) => {
        if (trendMap[d.day] !== undefined) trendMap[d.day] += d.count;
      });
    } else {
      // employee / team_lead
      let where = 'WHERE employee_id = $1';
      let params = [req.user.id];
      if (role === 'team_lead') {
        where = 'WHERE team_lead_id = $1';
      }
      const rStatus = await pool.query(
        `SELECT status, COUNT(*)::int AS count FROM reports ${where} GROUP BY status`,
        params
      );
      byStatus = rStatus.rows;

      const rTrend = await pool.query(
        `SELECT report_date::date::text AS day, COUNT(*)::int AS count FROM reports ${where} AND report_date >= (CURRENT_DATE - INTERVAL '6 days')::date GROUP BY day`,
        params
      );
      rTrend.rows.forEach((r) => {
        if (trendMap[r.day] !== undefined) trendMap[r.day] += r.count;
      });
    }

    const trend = last7Days.map((day) => ({
      day,
      count: trendMap[day] || 0,
    }));

    res.json({
      success: true,
      range,
      byStatus,
      last7: trend,
      trend,
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
