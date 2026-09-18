const { pool } = require('../config/db');

// GET /api/supervisor/files - Fetch all shared files across all modules
async function getAllFiles(req, res, next) {
  try {
    const files = [];

    // 1. Files from Report Attachments table
    const rf = await pool.query(`
      SELECT 
        ra.id, 
        ra.file_name, 
        ra.file_path, 
        ra.file_path AS file_url,
        ra.mime_type AS file_type, 
        ra.file_size, 
        ra.created_at,
        r.id AS associated_id,
        r.title AS associated_title,
        'report' AS module,
        u.name AS uploaded_by_name
      FROM report_attachments ra
      JOIN reports r ON r.id = ra.report_id
      LEFT JOIN users u ON u.id = ra.uploaded_by
      ORDER BY ra.created_at DESC
      LIMIT 100
    `);

    rf.rows.forEach((row) => {
      files.push({
        id: `report-${row.id}`,
        file_name: row.file_name || 'Report Document',
        file_url: row.file_url,
        file_type: row.file_type || 'application/pdf',
        file_size: row.file_size || 0,
        module: 'SEO Report',
        associated_id: row.associated_id,
        associated_title: row.associated_title,
        uploaded_by_name: row.uploaded_by_name,
        created_at: row.created_at,
      });
    });

    // 2. Attachments from Dev Requests
    const devReqs = await pool.query(`
      SELECT 
        dr.id, 
        dr.title, 
        dr.attachments, 
        dr.created_at, 
        u.name AS employee_name
      FROM dev_requests dr
      JOIN users u ON u.id = dr.employee_id
      WHERE dr.attachments IS NOT NULL AND jsonb_array_length(dr.attachments) > 0
      ORDER BY dr.created_at DESC
      LIMIT 100
    `);

    devReqs.rows.forEach((row) => {
      if (Array.isArray(row.attachments)) {
        row.attachments.forEach((att, idx) => {
          files.push({
            id: `dev-${row.id}-${idx}`,
            file_name: att.name || 'Dev Ticket Attachment',
            file_url: att.url,
            file_type: att.type || 'image',
            file_size: att.size || 0,
            module: 'Dev Request',
            associated_id: row.id,
            associated_title: row.title,
            uploaded_by_name: row.employee_name,
            created_at: row.created_at,
          });
        });
      }
    });

    // 3. Attachments from Dev Request Comments (table optional — skip if it doesn't exist)
    let devComments = { rows: [] };
    try {
      devComments = await pool.query(`
      SELECT
        c.id,
        c.file_url,
        c.file_name,
        c.file_type,
        c.created_at,
        c.request_id,
        dr.title AS associated_title,
        u.name AS commenter_name
      FROM dev_request_comments c
      JOIN dev_requests dr ON dr.id = c.request_id
      JOIN users u ON u.id = c.user_id
      WHERE c.file_url IS NOT NULL AND c.file_url <> ''
      ORDER BY c.created_at DESC
      LIMIT 100
    `);
    } catch (e) { /* dev_request_comments table not present — safe to skip */ }

    devComments.rows.forEach((row) => {
      files.push({
        id: `dev-comment-${row.id}`,
        file_name: row.file_name || 'Dev Comment File',
        file_url: row.file_url,
        file_type: row.file_type || 'attachment',
        file_size: 0,
        module: 'Dev Discussion',
        associated_id: row.request_id,
        associated_title: row.associated_title,
        uploaded_by_name: row.commenter_name,
        created_at: row.created_at,
      });
    });

    // 4. Attachments from Design Requests
    const desReqs = await pool.query(`
      SELECT 
        dr.id, 
        dr.title, 
        dr.attachments, 
        dr.created_at, 
        u.name AS employee_name
      FROM design_requests dr
      JOIN users u ON u.id = dr.employee_id
      WHERE dr.attachments IS NOT NULL AND jsonb_array_length(dr.attachments) > 0
      ORDER BY dr.created_at DESC
      LIMIT 100
    `);

    desReqs.rows.forEach((row) => {
      if (Array.isArray(row.attachments)) {
        row.attachments.forEach((att, idx) => {
          files.push({
            id: `design-${row.id}-${idx}`,
            file_name: att.name || 'Editor Request Attachment',
            file_url: att.url,
            file_type: att.type || 'image',
            file_size: att.size || 0,
            module: 'Editor Request',
            associated_id: row.id,
            associated_title: row.title,
            uploaded_by_name: row.employee_name,
            created_at: row.created_at,
          });
        });
      }
    });

    // 5. Attachments from Design Request Comments (table optional — skip if it doesn't exist)
    let desComments = { rows: [] };
    try {
      desComments = await pool.query(`
      SELECT
        c.id,
        c.file_url,
        c.file_name,
        c.file_type,
        c.created_at,
        c.request_id,
        dr.title AS associated_title,
        u.name AS commenter_name
      FROM design_request_comments c
      JOIN design_requests dr ON dr.id = c.request_id
      JOIN users u ON u.id = c.user_id
      WHERE c.file_url IS NOT NULL AND c.file_url <> ''
      ORDER BY c.created_at DESC
      LIMIT 100
    `);
    } catch (e) { /* design_request_comments table not present — safe to skip */ }

    desComments.rows.forEach((row) => {
      files.push({
        id: `design-comment-${row.id}`,
        file_name: row.file_name || 'Editor Comment File',
        file_url: row.file_url,
        file_type: row.file_type || 'attachment',
        file_size: 0,
        module: 'Editor Discussion',
        associated_id: row.request_id,
        associated_title: row.associated_title,
        uploaded_by_name: row.commenter_name,
        created_at: row.created_at,
      });
    });

    // Sort all files by created_at DESC
    files.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ success: true, files });
  } catch (err) {
    next(err);
  }
}

// GET /api/supervisor/team-overview - Detailed metrics for team performance
async function getTeamOverview(req, res, next) {
  try {
    const devs = await pool.query(`
      SELECT 
        u.id, u.name, u.email, u.role, u.is_active,
        COUNT(dr.id) FILTER (WHERE dr.status NOT IN ('resolved')) AS open_tickets,
        COUNT(dr.id) FILTER (WHERE dr.status = 'resolved') AS resolved_tickets,
        COALESCE(SUM(dr.hours_spent), 0) AS total_hours
      FROM users u
      LEFT JOIN dev_requests dr ON dr.developer_id = u.id
      WHERE u.role = 'developer'
      GROUP BY u.id
      ORDER BY u.name
    `);

    const editors = await pool.query(`
      SELECT 
        u.id, u.name, u.email, u.role, u.is_active,
        COUNT(dr.id) FILTER (WHERE dr.status NOT IN ('resolved')) AS open_tickets,
        COUNT(dr.id) FILTER (WHERE dr.status = 'resolved') AS resolved_tickets,
        COALESCE(SUM(dr.hours_spent), 0) AS total_hours
      FROM users u
      LEFT JOIN design_requests dr ON dr.designer_id = u.id
      WHERE u.role::text IN ('designer', 'editor')
      GROUP BY u.id
      ORDER BY u.name
    `);

    const employees = await pool.query(`
      SELECT 
        u.id, u.name, u.email, u.role, u.is_active, t.name AS team_name,
        (SELECT COUNT(*) FROM dev_requests WHERE employee_id = u.id) AS dev_tickets_raised,
        (SELECT COUNT(*) FROM design_requests WHERE employee_id = u.id) AS design_tickets_raised,
        (SELECT COUNT(*) FROM reports WHERE employee_id = u.id) AS reports_submitted
      FROM users u
      LEFT JOIN teams t ON t.id = u.team_id
      WHERE u.role = 'employee'
      ORDER BY u.name
    `);

    res.json({
      success: true,
      developers: devs.rows,
      editors: editors.rows,
      employees: employees.rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllFiles,
  getTeamOverview,
};
