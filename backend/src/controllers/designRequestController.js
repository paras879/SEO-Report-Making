const { pool } = require('../config/db');
const { logAudit } = require('../utils/audit');
const { notify } = require('../utils/notify');

const REQ_COLS = `
  id, employee_id, team_id, team_lead_id, designer_id, title, category, blog_category,
  keywords, points_to_include, priority, status, current_level, client_name, due_date,
  attachments, hours_spent, resolved_at, created_at, updated_at`;

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const CATEGORIES = ['On-Page', 'Blog Request', 'Social Media / Infographics', 'Custom Graphic', 'Other'];
const BLOG_CATEGORIES = ['Information', 'Lexical', 'Case Studies', 'Other'];

function cleanAttachments(raw) {
  if (!Array.isArray(raw)) return [];
  const list = [];
  for (const a of raw) {
    if (!a || typeof a !== 'object') continue;
    const name = String(a.name || 'Attachment').slice(0, 150);
    const url = String(a.url || '').trim();
    if (!url) continue;
    const type = String(a.type || 'image').slice(0, 50);
    const size = Number(a.size) || 0;
    list.push({ name, url, type, size });
    if (list.length >= 10) break;
  }
  return list;
}

async function canAccess(user, r) {
  if (['super_admin', 'admin', 'supervisor'].includes(user.role)) return true;
  if (user.role === 'team_lead') return r.team_lead_id === user.id;
  if (['designer', 'editor'].includes(user.role)) return r.designer_id === user.id;
  return r.employee_id === user.id;
}

// GET /api/design-requests/designers -> active designers
async function listDesigners(req, res, next) {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, username, role FROM users WHERE role='designer' AND is_active=TRUE ORDER BY name"
    );
    if (rows.length > 0) {
      return res.json({ success: true, designers: rows });
    }
    const fallback = await pool.query(
      "SELECT id, name, username, role FROM users WHERE role IN ('designer', 'team_lead', 'admin', 'super_admin') AND is_active=TRUE ORDER BY name"
    );
    res.json({ success: true, designers: fallback.rows });
  } catch (err) { next(err); }
}

// POST /api/design-requests (employee)
async function createRequest(req, res, next) {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({ success: false, message: 'Only employees can raise a designer request' });
    }
    if (!req.user.team_id) {
      return res.status(422).json({ success: false, message: 'You are not assigned to any team yet. Contact admin.' });
    }

    const designerId = req.body.designer_id ? Number(req.body.designer_id) : null;
    if (!designerId) {
      return res.status(422).json({ success: false, message: 'Please select a designer to assign this request' });
    }

    const category = String(req.body.category || 'On-Page').trim();
    const blogCategory = req.body.blog_category ? String(req.body.blog_category).trim() : null;
    const title = req.body.title ? String(req.body.title).trim().slice(0, 200) : null;
    const keywords = req.body.keywords ? String(req.body.keywords).trim() : null;
    const pointsToInclude = req.body.points_to_include ? String(req.body.points_to_include).trim() : null;
    const priority = PRIORITIES.includes(req.body.priority) ? req.body.priority : 'medium';
    const clientName = req.body.client_name ? String(req.body.client_name).trim().slice(0, 160) : null;
    const dueDate = req.body.due_date ? String(req.body.due_date).trim() : null;
    const attachments = cleanAttachments(req.body.attachments);

    const team = await pool.query('SELECT team_lead_id FROM teams WHERE id=$1', [req.user.team_id]);
    const teamLeadId = team.rows[0]?.team_lead_id || null;

    const { rows } = await pool.query(
      `INSERT INTO design_requests
        (employee_id, team_id, team_lead_id, designer_id, title, category, blog_category, keywords, points_to_include,
         priority, status, current_level, client_name, due_date, attachments)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'forwarded','designer',$11,$12,$13) RETURNING ${REQ_COLS}`,
      [
        req.user.id, req.user.team_id, teamLeadId, designerId, title, category, blogCategory, keywords, pointsToInclude,
        priority, clientName, dueDate || null, JSON.stringify(attachments),
      ]
    );
    const request = rows[0];

    await pool.query(
      `INSERT INTO design_request_events (request_id, actor_id, actor_role, action, message)
       VALUES ($1,$2,'employee','submitted',$3)`,
      [request.id, req.user.id, `Design Request raised & assigned to designer [Category: ${category}${blogCategory ? `, Blog Category: ${blogCategory}` : ''}]`]
    );

    if (designerId) {
      await notify({
        userId: designerId,
        title: 'New Designer Request Assigned 🎨',
        message: `${req.user.name} assigned you a design request (${category}${title ? `: ${title}` : ''})`,
      });
    }

    if (teamLeadId) {
      await notify({
        userId: teamLeadId,
        title: 'New Designer Request',
        message: `${req.user.name} submitted design request (${category}${title ? `: ${title}` : ''})`,
      });
    }

    await logAudit({ userId: req.user.id, action: 'designreq_created', entityType: 'design_request', entityId: request.id, req });
    res.status(201).json({ success: true, request });
  } catch (err) { next(err); }
}

// POST /api/design-requests/bulk-csv (employee)
async function createBulkCSVRequests(req, res, next) {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({ success: false, message: 'Only employees can upload bulk requests' });
    }
    if (!req.user.team_id) {
      return res.status(422).json({ success: false, message: 'You are not assigned to any team yet. Contact admin.' });
    }

    const designerId = req.body.designer_id ? Number(req.body.designer_id) : null;
    if (!designerId) {
      return res.status(422).json({ success: false, message: 'Please select a designer to assign these bulk requests' });
    }

    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(422).json({ success: false, message: 'No rows provided in CSV data' });
    }

    const team = await pool.query('SELECT team_lead_id FROM teams WHERE id=$1', [req.user.team_id]);
    const teamLeadId = team.rows[0]?.team_lead_id || null;

    const insertedRequests = [];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const item of items) {
        const category = String(item.category || 'Blog Request').trim();
        const blogCategory = item.blog_category || item.blogCategory ? String(item.blog_category || item.blogCategory).trim() : null;
        const title = item.title ? String(item.title).trim().slice(0, 200) : null;
        const keywords = item.keywords ? String(item.keywords).trim() : null;
        const pointsToInclude = item.points_to_include || item.pointsToInclude ? String(item.points_to_include || item.pointsToInclude).trim() : null;
        const priority = PRIORITIES.includes(item.priority) ? item.priority : 'medium';
        const clientName = item.client_name || item.clientName ? String(item.client_name || item.clientName).trim().slice(0, 160) : null;

        const resDb = await client.query(
          `INSERT INTO design_requests
            (employee_id, team_id, team_lead_id, designer_id, title, category, blog_category, keywords, points_to_include,
             priority, status, current_level, client_name)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'forwarded','designer',$11) RETURNING ${REQ_COLS}`,
          [
            req.user.id, req.user.team_id, teamLeadId, designerId, title, category, blogCategory, keywords, pointsToInclude,
            priority, clientName,
          ]
        );
        const reqObj = resDb.rows[0];
        insertedRequests.push(reqObj);

        await client.query(
          `INSERT INTO design_request_events (request_id, actor_id, actor_role, action, message)
           VALUES ($1,$2,'employee','submitted',$3)`,
          [reqObj.id, req.user.id, `Bulk CSV upload row created and assigned to designer`]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    if (designerId) {
      await notify({
        userId: designerId,
        title: 'Bulk Designer Requests Assigned 🎨',
        message: `${req.user.name} assigned ${insertedRequests.length} design requests to you via CSV.`,
      });
    }

    if (teamLeadId && insertedRequests.length > 0) {
      await notify({
        userId: teamLeadId,
        title: 'Bulk Designer Requests Uploaded',
        message: `${req.user.name} uploaded ${insertedRequests.length} design requests via CSV.`,
      });
    }

    await logAudit({ userId: req.user.id, action: 'designreq_bulk_created', entityType: 'design_request', details: { count: insertedRequests.length }, req });
    res.status(201).json({ success: true, count: insertedRequests.length, requests: insertedRequests });
  } catch (err) { next(err); }
}

// POST /api/design-requests/:id/forward (team_lead / admin)
async function forwardToDesigner(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM design_requests WHERE id=$1', [req.params.id]);
    const request = r.rows[0];
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    const isTL = req.user.role === 'team_lead' && request.team_lead_id === req.user.id;
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role);
    if (!isTL && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only assigned team lead or admin can assign designer' });
    }

    const designerId = Number(req.body.designer_id);
    const des = await pool.query("SELECT id, name FROM users WHERE id=$1 AND role='designer' AND is_active=TRUE", [designerId]);
    if (!des.rows[0]) return res.status(422).json({ success: false, message: 'Choose a valid designer' });

    const { rows } = await pool.query(
      `UPDATE design_requests SET designer_id=$1, status='forwarded', current_level='designer', updated_at=now()
       WHERE id=$2 RETURNING ${REQ_COLS}`,
      [designerId, req.params.id]
    );

    await pool.query(
      `INSERT INTO design_request_events (request_id, actor_id, actor_role, action, message)
       VALUES ($1,$2,$3,'forwarded',$4)`,
      [request.id, req.user.id, req.user.role, req.body.message || `Forwarded to designer ${des.rows[0].name}`]
    );

    await notify({ userId: designerId, title: 'New design task assigned 🎨', message: `${req.user.name} assigned you: ${request.title || request.category}` });
    res.json({ success: true, request: rows[0] });
  } catch (err) { next(err); }
}

// POST /api/design-requests/:id/start-progress (designer / admin)
async function startProgress(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM design_requests WHERE id=$1', [req.params.id]);
    const request = r.rows[0];
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    const isDesigner = req.user.role === 'designer' && request.designer_id === req.user.id;
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role);
    if (!isDesigner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only assigned designer can start progress' });
    }

    const { rows } = await pool.query(
      `UPDATE design_requests SET status='in_progress', current_level='designer', updated_at=now()
       WHERE id=$1 RETURNING ${REQ_COLS}`,
      [req.params.id]
    );
    await pool.query(
      `INSERT INTO design_request_events (request_id, actor_id, actor_role, action, message)
       VALUES ($1,$2,$3,'in_progress',$4)`,
      [request.id, req.user.id, req.user.role, req.body.message || 'Designer started working on visuals 🎨']
    );

    const targets = new Set([request.team_lead_id, request.employee_id].filter(Boolean));
    for (const uid of targets) await notify({ userId: uid, title: 'Designer working on visuals 🎨', message: `${req.user.name} started working on: ${request.title || request.category}` });

    res.json({ success: true, request: rows[0] });
  } catch (err) { next(err); }
}

// POST /api/design-requests/:id/submit-qa (designer)
async function submitForQA(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM design_requests WHERE id=$1', [req.params.id]);
    const request = r.rows[0];
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    const isDesigner = req.user.role === 'designer' && request.designer_id === req.user.id;
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role);
    if (!isDesigner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only assigned designer can submit for review' });
    }
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(422).json({ success: false, message: 'Please describe design submission / assets' });
    const addHours = Math.max(0, Number(req.body.hours_spent) || 0);

    const { rows } = await pool.query(
      `UPDATE design_requests
       SET status='under_qa', current_level='team_lead', hours_spent=COALESCE(hours_spent,0)+$1, updated_at=now()
       WHERE id=$2 RETURNING ${REQ_COLS}`,
      [addHours, req.params.id]
    );
    await pool.query(
      `INSERT INTO design_request_events (request_id, actor_id, actor_role, action, message)
       VALUES ($1,$2,$3,'under_qa',$4)`,
      [request.id, req.user.id, req.user.role, `${message}${addHours ? ` (${addHours} hrs logged)` : ''}`]
    );

    const targets = new Set([request.team_lead_id, request.employee_id].filter(Boolean));
    for (const uid of targets) await notify({ userId: uid, title: 'Design ready for review 🖼️', message: `${req.user.name} submitted designs: ${message.slice(0, 60)}` });

    res.json({ success: true, request: rows[0] });
  } catch (err) { next(err); }
}

// POST /api/design-requests/:id/resolve (designer / team_lead / admin)
async function resolveRequest(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM design_requests WHERE id=$1', [req.params.id]);
    const request = r.rows[0];
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (!(await canAccess(req.user, request))) return res.status(403).json({ success: false, message: 'Access denied' });

    const message = String(req.body.message || '').trim();
    if (!message) return res.status(422).json({ success: false, message: 'Please add a resolution message' });
    const addHours = Math.max(0, Number(req.body.hours_spent) || 0);

    const { rows } = await pool.query(
      `UPDATE design_requests
       SET status='resolved', current_level='team_lead', hours_spent=COALESCE(hours_spent,0)+$1, resolved_at=now(), updated_at=now()
       WHERE id=$2 RETURNING ${REQ_COLS}`,
      [addHours, req.params.id]
    );
    await pool.query(
      `INSERT INTO design_request_events (request_id, actor_id, actor_role, action, message) VALUES ($1,$2,$3,'resolved',$4)`,
      [request.id, req.user.id, req.user.role, `${message}${addHours ? ` (${addHours} hrs logged)` : ''}`]
    );

    const targets = new Set([request.team_lead_id, request.employee_id].filter(Boolean));
    for (const uid of targets) {
      if (uid !== req.user.id) await notify({ userId: uid, title: 'Design completed ✅', message: `${req.user.name}: ${message.slice(0, 60)}` });
    }

    // Auto send direct chat message to employee when resolved by editor/team
    if (request.employee_id && req.user.id !== request.employee_id) {
      try {
        await pool.query(
          `INSERT INTO messages (sender_id, receiver_id, body) VALUES ($1,$2,$3)`,
          [
            req.user.id,
            request.employee_id,
            `✅ Your Editor Request "${request.title || 'Visual Graphic'}" has been marked COMPLETED!\n\nResolution Details: ${message}`,
          ]
        );
      } catch (e) {
        console.error('Failed to send auto chat message on design resolve', e);
      }
    }

    res.json({ success: true, request: rows[0] });
  } catch (err) { next(err); }
}

// POST /api/design-requests/:id/reopen
async function reopenRequest(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM design_requests WHERE id=$1', [req.params.id]);
    const request = r.rows[0];
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (!(await canAccess(req.user, request))) return res.status(403).json({ success: false, message: 'Access denied' });
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(422).json({ success: false, message: 'Please provide a reason for reopening' });

    const targetLevel = request.designer_id ? 'designer' : 'team_lead';
    const { rows } = await pool.query(
      `UPDATE design_requests SET status='reopened', current_level=$1, updated_at=now() WHERE id=$2 RETURNING ${REQ_COLS}`,
      [targetLevel, req.params.id]
    );
    await pool.query(
      `INSERT INTO design_request_events (request_id, actor_id, actor_role, action, message) VALUES ($1,$2,$3,'reopened',$4)`,
      [request.id, req.user.id, req.user.role, `Re-opened: ${message}`]
    );
    res.json({ success: true, request: rows[0] });
  } catch (err) { next(err); }
}

// POST /api/design-requests/:id/reject
async function tlReject(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM design_requests WHERE id=$1', [req.params.id]);
    const request = r.rows[0];
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    const isTL = req.user.role === 'team_lead' && request.team_lead_id === req.user.id;
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role);
    if (!isTL && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only team lead or admin can return this' });
    }
    const { rows } = await pool.query(
      `UPDATE design_requests SET status='tl_rejected', current_level='employee', updated_at=now() WHERE id=$1 RETURNING ${REQ_COLS}`,
      [req.params.id]
    );
    await pool.query(
      `INSERT INTO design_request_events (request_id, actor_id, actor_role, action, message) VALUES ($1,$2,$3,'rejected',$4)`,
      [request.id, req.user.id, req.user.role, req.body.message || 'Returned for more details']
    );
    await notify({ userId: request.employee_id, title: 'Design request returned', message: req.body.message || 'Team lead returned your design request' });
    res.json({ success: true, request: rows[0] });
  } catch (err) { next(err); }
}

// POST /api/design-requests/:id/comments
async function addComment(req, res, next) {
  try {
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(422).json({ success: false, message: 'Message cannot be empty' });
    const r = await pool.query('SELECT * FROM design_requests WHERE id=$1', [req.params.id]);
    const request = r.rows[0];
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (!(await canAccess(req.user, request))) return res.status(403).json({ success: false, message: 'Access denied' });

    await pool.query(
      `INSERT INTO design_request_events (request_id, actor_id, actor_role, action, message) VALUES ($1,$2,$3,'commented',$4)`,
      [request.id, req.user.id, req.user.role, message]
    );
    res.status(201).json({ success: true });
  } catch (err) { next(err); }
}

// GET /api/design-requests
async function listRequests(req, res, next) {
  try {
    const conds = [];
    const params = [];
    let i = 1;
    if (req.user.role === 'employee') { conds.push(`r.employee_id=$${i++}`); params.push(req.user.id); }
    else if (req.user.role === 'team_lead') { conds.push(`r.team_lead_id=$${i++}`); params.push(req.user.id); }
    else if (req.user.role === 'designer') { conds.push(`r.designer_id=$${i++}`); params.push(req.user.id); }

    if (req.query.status) { conds.push(`r.status=$${i++}`); params.push(req.query.status); }
    if (req.query.category) { conds.push(`r.category=$${i++}`); params.push(req.query.category); }
    if (req.query.blog_category) { conds.push(`r.blog_category=$${i++}`); params.push(req.query.blog_category); }

    if (req.query.search) {
      conds.push(`(r.title ILIKE $${i} OR r.keywords ILIKE $${i} OR r.points_to_include ILIKE $${i} OR r.client_name ILIKE $${i} OR e.name ILIKE $${i})`);
      params.push(`%${req.query.search.trim()}%`);
      i++;
    }
    if (req.query.from) { conds.push(`r.created_at >= $${i++}`); params.push(req.query.from); }
    if (req.query.to) { conds.push(`r.created_at <= $${i++}`); params.push(req.query.to); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT r.*, e.name AS employee_name, tl.name AS team_lead_name, des.name AS designer_name, t.name AS team_name
       FROM design_requests r
       LEFT JOIN users e ON e.id=r.employee_id
       LEFT JOIN users tl ON tl.id=r.team_lead_id
       LEFT JOIN users des ON des.id=r.designer_id
       LEFT JOIN teams t ON t.id=r.team_id
       ${where} ORDER BY r.updated_at DESC`,
      params
    );
    res.json({ success: true, count: rows.length, requests: rows });
  } catch (err) { next(err); }
}

// GET /api/design-requests/export -> CSV / Excel export
async function exportCSV(req, res, next) {
  try {
    const conds = [];
    const params = [];
    let i = 1;
    if (req.user.role === 'employee') { conds.push(`r.employee_id=$${i++}`); params.push(req.user.id); }
    else if (req.user.role === 'team_lead') { conds.push(`r.team_lead_id=$${i++}`); params.push(req.user.id); }
    else if (req.user.role === 'designer') { conds.push(`r.designer_id=$${i++}`); params.push(req.user.id); }

    const safeIso = (d) => {
      if (!d) return '';
      try {
        const dt = new Date(d);
        return isNaN(dt.getTime()) ? String(d) : dt.toISOString();
      } catch (e) { return String(d || ''); }
    };

    const safeDateOnly = (d) => {
      if (!d) return '';
      try {
        const dt = new Date(d);
        return isNaN(dt.getTime()) ? String(d).slice(0, 10) : dt.toISOString().split('T')[0];
      } catch (e) { return String(d || '').slice(0, 10); }
    };

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT r.id, r.title, r.category, r.blog_category, r.keywords, r.points_to_include, r.priority,
              r.status, r.client_name, r.due_date, r.hours_spent, r.created_at, r.resolved_at,
              e.name AS employee_name, tl.name AS team_lead_name, des.name AS designer_name
       FROM design_requests r
       LEFT JOIN users e ON e.id=r.employee_id
       LEFT JOIN users tl ON tl.id=r.team_lead_id
       LEFT JOIN users des ON des.id=r.designer_id
       ${where} ORDER BY r.created_at DESC`,
      params
    );

    const headers = [
      'ID', 'Title', 'Category', 'Blog Category', 'Keywords', 'Points to Include',
      'Priority', 'Status', 'Client', 'Employee', 'Team Lead', 'Designer',
      'Hours Spent', 'Due Date', 'Created At', 'Resolved At'
    ];
    const csvLines = [headers.join(',')];

    for (const r of rows) {
      const escape = (v) => `"${String(v === null || v === undefined ? '' : v).replace(/"/g, '""')}"`;
      csvLines.push([
        r.id,
        escape(r.title),
        escape(r.category),
        escape(r.blog_category),
        escape(r.keywords),
        escape(r.points_to_include),
        escape(r.priority),
        escape(r.status),
        escape(r.client_name),
        escape(r.employee_name),
        escape(r.team_lead_name),
        escape(r.designer_name),
        r.hours_spent || 0,
        escape(safeDateOnly(r.due_date)),
        escape(safeIso(r.created_at)),
        escape(safeIso(r.resolved_at)),
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=design-requests.csv');
    res.send(csvLines.join('\n'));
  } catch (err) { next(err); }
}

// GET /api/design-requests/:id
async function getRequest(req, res, next) {
  try {
    const r = await pool.query(
      `SELECT r.*, e.name AS employee_name, tl.name AS team_lead_name, des.name AS designer_name, t.name AS team_name
       FROM design_requests r
       LEFT JOIN users e ON e.id=r.employee_id
       LEFT JOIN users tl ON tl.id=r.team_lead_id
       LEFT JOIN users des ON des.id=r.designer_id
       LEFT JOIN teams t ON t.id=r.team_id
       WHERE r.id=$1`, [req.params.id]
    );
    const request = r.rows[0];
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (!(await canAccess(req.user, request))) return res.status(403).json({ success: false, message: 'Access denied' });

    const events = await pool.query(
      `SELECT ev.*, u.name AS actor_name FROM design_request_events ev
       LEFT JOIN users u ON u.id=ev.actor_id WHERE ev.request_id=$1 ORDER BY ev.created_at ASC`,
      [req.params.id]
    );
    res.json({ success: true, request, events: events.rows });
  } catch (err) { next(err); }
}

// DELETE /api/design-requests/:id
async function deleteRequest(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM design_requests WHERE id=$1', [req.params.id]);
    const request = r.rows[0];
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    const isCreator = request.employee_id === req.user.id;
    const isTL = req.user.role === 'team_lead' && request.team_lead_id === req.user.id;
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role);

    if (!isCreator && !isTL && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only creator, assigned team lead, or admin can delete this request' });
    }

    await pool.query('DELETE FROM design_request_events WHERE request_id=$1', [req.params.id]);
    await pool.query('DELETE FROM design_requests WHERE id=$1', [req.params.id]);

    await logAudit({ userId: req.user.id, action: 'designreq_deleted', entityType: 'design_request', entityId: req.params.id, req });
    res.json({ success: true, message: 'Design request deleted successfully' });
  } catch (err) { next(err); }
}

module.exports = {
  listDesigners,
  createRequest,
  createBulkCSVRequests,
  forwardToDesigner,
  startProgress,
  submitForQA,
  resolveRequest,
  reopenRequest,
  tlReject,
  addComment,
  listRequests,
  getRequest,
  exportCSV,
  deleteRequest,
};
