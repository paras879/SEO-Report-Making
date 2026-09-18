const { pool } = require('../config/db');
const { logAudit } = require('../utils/audit');
const { notify } = require('../utils/notify');

const REQ_COLS = `
  id, employee_id, team_id, team_lead_id, developer_id, title, description,
  sites, priority, status, current_level, category, client_name, due_date,
  credentials_note, attachments, hours_spent, resolved_at, created_at, updated_at`;

const PRIORITIES = ['low', 'medium', 'high'];
const CATEGORIES = [
  'hosting_server',
  'ssl_security',
  'http_errors',
  'speed_cwv',
  'cms_plugin',
  'schema_meta',
  'feature_request',
  'other',
];

// ---- sites ko clean + validate karo: [{ name, urls: [] }] ----
function cleanSites(raw) {
  if (!Array.isArray(raw)) return { ok: false, message: 'At least one site is required' };
  const sites = [];
  for (const s of raw) {
    if (!s || typeof s !== 'object') continue;
    const name = String(s.name || '').trim().slice(0, 200);
    const urls = Array.isArray(s.urls)
      ? s.urls.map((u) => String(u || '').trim()).filter(Boolean).slice(0, 20)
      : [];
    if (!name && urls.length === 0) continue;
    sites.push({ name: name || '(unnamed site)', urls });
  }
  if (sites.length === 0) return { ok: false, message: 'Add at least one site with a name or URL' };
  if (sites.length > 20) return { ok: false, message: 'Too many sites (max 20)' };
  return { ok: true, sites };
}

// ---- attachments validation [{ name, url, type, size }] ----
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
  if (user.role === 'developer') return r.developer_id === user.id;
  return r.employee_id === user.id; // employee
}

// GET /api/dev-requests/developers -> active developers (or team members if none tagged developer yet)
async function listDevelopers(req, res, next) {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, username, role FROM users WHERE role='developer' AND is_active=TRUE ORDER BY name"
    );
    if (rows.length > 0) {
      return res.json({ success: true, developers: rows });
    }
    // Fallback: return active team lead, admin, super_admin if no user has role='developer' yet
    const fallback = await pool.query(
      "SELECT id, name, username, role FROM users WHERE role IN ('developer', 'team_lead', 'admin', 'super_admin') AND is_active=TRUE ORDER BY name"
    );
    res.json({ success: true, developers: fallback.rows });
  } catch (err) { next(err); }
}

// POST /api/dev-requests  (employee)
async function createRequest(req, res, next) {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({ success: false, message: 'Only employees can raise a developer request' });
    }
    if (!req.user.team_id) {
      return res.status(422).json({ success: false, message: 'You are not assigned to any team yet. Contact admin.' });
    }
    const title = String(req.body.title || '').trim();
    if (!title) return res.status(422).json({ success: false, message: 'Title is required' });
    const cs = cleanSites(req.body.sites);
    if (!cs.ok) return res.status(422).json({ success: false, message: cs.message });

    const priority = PRIORITIES.includes(req.body.priority) ? req.body.priority : 'medium';
    const category = CATEGORIES.includes(req.body.category) ? req.body.category : 'other';
    const clientName = req.body.client_name ? String(req.body.client_name).trim().slice(0, 160) : null;
    const dueDate = req.body.due_date ? String(req.body.due_date).trim() : null;
    const credentialsNote = req.body.credentials_note ? String(req.body.credentials_note).trim().slice(0, 3000) : null;
    const attachments = cleanAttachments(req.body.attachments);
    const developerId = req.body.developer_id ? Number(req.body.developer_id) : null;
    if (!developerId) {
      return res.status(422).json({ success: false, message: 'Please select a developer to assign this request' });
    }

    let devName = null;
    const devRes = await pool.query("SELECT id, name FROM users WHERE id=$1 AND is_active=TRUE", [developerId]);
    if (devRes.rows[0]) {
      devName = devRes.rows[0].name;
    }

    const team = await pool.query('SELECT team_lead_id FROM teams WHERE id=$1', [req.user.team_id]);
    const teamLeadId = team.rows[0]?.team_lead_id || null;

    const status = 'forwarded';
    const currentLevel = 'developer';

    const { rows } = await pool.query(
      `INSERT INTO dev_requests
        (employee_id, team_id, team_lead_id, developer_id, title, description, sites, priority,
         status, current_level, category, client_name, due_date, credentials_note, attachments)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING ${REQ_COLS}`,
      [
        req.user.id, req.user.team_id, teamLeadId, developerId, title, req.body.description || null,
        JSON.stringify(cs.sites), priority, status, currentLevel, category, clientName, dueDate || null,
        credentialsNote, JSON.stringify(attachments),
      ]
    );
    const request = rows[0];

    const eventMsg = `Request raised [Category: ${category}] and assigned to developer ${devName || 'Developer'}`;

    await pool.query(
      `INSERT INTO dev_request_events (request_id, actor_id, actor_role, action, message)
       VALUES ($1,$2,'employee','submitted',$3)`,
      [request.id, req.user.id, eventMsg]
    );

    if (developerId) {
      await notify({ userId: developerId, title: 'New developer request assigned 🛠️', message: `${req.user.name} assigned you: ${title}` });
    }
    if (teamLeadId) {
      await notify({ userId: teamLeadId, title: 'New developer request raised', message: `${req.user.name}: ${title}${devName ? ` (Assigned to ${devName})` : ''}` });
    }

    await logAudit({ userId: req.user.id, action: 'devreq_created', entityType: 'dev_request', entityId: request.id, req });
    res.status(201).json({ success: true, request });
  } catch (err) { next(err); }
}

// POST /api/dev-requests/:id/forward  (team_lead / admin)
async function forwardToDeveloper(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM dev_requests WHERE id=$1', [req.params.id]);
    const request = r.rows[0];
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    const isTL = req.user.role === 'team_lead' && request.team_lead_id === req.user.id;
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role);
    if (!isTL && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only the assigned team lead or admin can forward this' });
    }
    const developerId = Number(req.body.developer_id);
    const dev = await pool.query("SELECT id, name FROM users WHERE id=$1 AND role='developer' AND is_active=TRUE", [developerId]);
    if (!dev.rows[0]) return res.status(422).json({ success: false, message: 'Choose a valid developer' });

    const { rows } = await pool.query(
      `UPDATE dev_requests SET developer_id=$1, status='forwarded', current_level='developer', updated_at=now()
       WHERE id=$2 RETURNING ${REQ_COLS}`,
      [developerId, req.params.id]
    );
    await pool.query(
      `INSERT INTO dev_request_events (request_id, actor_id, actor_role, action, message)
       VALUES ($1,$2,$3,'forwarded',$4)`,
      [request.id, req.user.id, req.user.role, req.body.message || `Forwarded to developer ${dev.rows[0].name}`]
    );
    await notify({ userId: developerId, title: 'New request assigned', message: `${req.user.name} assigned you: ${request.title}` });
    const admins = await pool.query("SELECT id FROM users WHERE role IN ('admin','super_admin') AND is_active=TRUE");
    for (const a of admins.rows) await notify({ userId: a.id, title: 'Request forwarded to developer', message: `${req.user.name} forwarded a request to ${dev.rows[0].name}` });
    await logAudit({ userId: req.user.id, action: 'devreq_forwarded', entityType: 'dev_request', entityId: request.id, req });
    res.json({ success: true, request: rows[0] });
  } catch (err) { next(err); }
}

// POST /api/dev-requests/:id/start-progress (developer / admin)
async function startProgress(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM dev_requests WHERE id=$1', [req.params.id]);
    const request = r.rows[0];
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    const isDev = req.user.role === 'developer' && request.developer_id === req.user.id;
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role);
    if (!isDev && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only the assigned developer can start progress' });
    }

    const { rows } = await pool.query(
      `UPDATE dev_requests SET status='in_progress', current_level='developer', updated_at=now()
       WHERE id=$1 RETURNING ${REQ_COLS}`,
      [req.params.id]
    );
    await pool.query(
      `INSERT INTO dev_request_events (request_id, actor_id, actor_role, action, message)
       VALUES ($1,$2,$3,'in_progress',$4)`,
      [request.id, req.user.id, req.user.role, req.body.message || 'Developer started working on this issue ⚙️']
    );
    const targets = new Set([request.team_lead_id, request.employee_id].filter(Boolean));
    for (const uid of targets) await notify({ userId: uid, title: 'Dev started working ⚙️', message: `${req.user.name} started working on: ${request.title}` });
    await logAudit({ userId: req.user.id, action: 'devreq_in_progress', entityType: 'dev_request', entityId: request.id, req });
    res.json({ success: true, request: rows[0] });
  } catch (err) { next(err); }
}

// POST /api/dev-requests/:id/submit-qa (developer)
async function submitForQA(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM dev_requests WHERE id=$1', [req.params.id]);
    const request = r.rows[0];
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    const isDev = req.user.role === 'developer' && request.developer_id === req.user.id;
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role);
    if (!isDev && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only the assigned developer can submit for QA' });
    }
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(422).json({ success: false, message: 'Please describe the fix for QA testing' });
    const addHours = Math.max(0, Number(req.body.hours_spent) || 0);

    const { rows } = await pool.query(
      `UPDATE dev_requests
       SET status='under_qa', current_level='team_lead', hours_spent=COALESCE(hours_spent,0)+$1, updated_at=now()
       WHERE id=$2 RETURNING ${REQ_COLS}`,
      [addHours, req.params.id]
    );
    await pool.query(
      `INSERT INTO dev_request_events (request_id, actor_id, actor_role, action, message)
       VALUES ($1,$2,$3,'under_qa',$4)`,
      [request.id, req.user.id, req.user.role, `${message}${addHours ? ` (${addHours} hrs logged)` : ''}`]
    );
    const targets = new Set([request.team_lead_id, request.employee_id].filter(Boolean));
    for (const uid of targets) await notify({ userId: uid, title: 'Ready for Testing / QA 🔍', message: `${req.user.name} submitted for QA: ${message.slice(0, 60)}` });
    await logAudit({ userId: req.user.id, action: 'devreq_under_qa', entityType: 'dev_request', entityId: request.id, req });
    res.json({ success: true, request: rows[0] });
  } catch (err) { next(err); }
}

// POST /api/dev-requests/:id/reject  (team_lead / admin) -> wapas employee ko
async function tlReject(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM dev_requests WHERE id=$1', [req.params.id]);
    const request = r.rows[0];
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    const isTL = req.user.role === 'team_lead' && request.team_lead_id === req.user.id;
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role);
    if (!isTL && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only the assigned team lead can return this' });
    }
    const { rows } = await pool.query(
      `UPDATE dev_requests SET status='tl_rejected', current_level='employee', updated_at=now() WHERE id=$1 RETURNING ${REQ_COLS}`,
      [req.params.id]
    );
    await pool.query(
      `INSERT INTO dev_request_events (request_id, actor_id, actor_role, action, message) VALUES ($1,$2,$3,'rejected',$4)`,
      [request.id, req.user.id, req.user.role, req.body.message || 'Returned for more details']
    );
    await notify({ userId: request.employee_id, title: 'Request returned', message: req.body.message || 'Team lead returned your request' });
    await logAudit({ userId: req.user.id, action: 'devreq_rejected', entityType: 'dev_request', entityId: request.id, req });
    res.json({ success: true, request: rows[0] });
  } catch (err) { next(err); }
}

// POST /api/dev-requests/:id/reopen (employee / team_lead / admin)
async function reopenRequest(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM dev_requests WHERE id=$1', [req.params.id]);
    const request = r.rows[0];
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (!(await canAccess(req.user, request))) return res.status(403).json({ success: false, message: 'Access denied' });
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(422).json({ success: false, message: 'Please provide a reason for reopening' });

    const targetLevel = request.developer_id ? 'developer' : 'team_lead';
    const { rows } = await pool.query(
      `UPDATE dev_requests SET status='reopened', current_level=$1, updated_at=now() WHERE id=$2 RETURNING ${REQ_COLS}`,
      [targetLevel, req.params.id]
    );
    await pool.query(
      `INSERT INTO dev_request_events (request_id, actor_id, actor_role, action, message) VALUES ($1,$2,$3,'reopened',$4)`,
      [request.id, req.user.id, req.user.role, `Re-opened: ${message}`]
    );
    const targets = new Set([request.team_lead_id, request.developer_id].filter(Boolean));
    for (const uid of targets) {
      if (uid !== req.user.id) await notify({ userId: uid, title: 'Ticket Re-opened ⚠️', message: `${req.user.name}: ${message.slice(0, 60)}` });
    }
    await logAudit({ userId: req.user.id, action: 'devreq_reopened', entityType: 'dev_request', entityId: request.id, req });
    res.json({ success: true, request: rows[0] });
  } catch (err) { next(err); }
}

// POST /api/dev-requests/:id/resolve  (developer / team_lead / admin)
async function resolveRequest(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM dev_requests WHERE id=$1', [req.params.id]);
    const request = r.rows[0];
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (!(await canAccess(req.user, request))) return res.status(403).json({ success: false, message: 'Access denied' });

    const message = String(req.body.message || '').trim();
    if (!message) return res.status(422).json({ success: false, message: 'Please add a resolution message' });
    const addHours = Math.max(0, Number(req.body.hours_spent) || 0);

    const { rows } = await pool.query(
      `UPDATE dev_requests
       SET status='resolved', current_level='team_lead', hours_spent=COALESCE(hours_spent,0)+$1, resolved_at=now(), updated_at=now()
       WHERE id=$2 RETURNING ${REQ_COLS}`,
      [addHours, req.params.id]
    );
    await pool.query(
      `INSERT INTO dev_request_events (request_id, actor_id, actor_role, action, message) VALUES ($1,$2,$3,'resolved',$4)`,
      [request.id, req.user.id, req.user.role, `${message}${addHours ? ` (${addHours} hrs logged)` : ''}`]
    );
    const targets = new Set([request.team_lead_id, request.employee_id].filter(Boolean));
    for (const uid of targets) {
      if (uid !== req.user.id) await notify({ userId: uid, title: 'Issue resolved ✅', message: `${req.user.name}: ${message.slice(0, 60)}` });
    }
    const admins = await pool.query("SELECT id FROM users WHERE role IN ('admin','super_admin') AND is_active=TRUE");
    for (const a of admins.rows) {
      if (a.id !== req.user.id) await notify({ userId: a.id, title: 'Dev request resolved', message: `${req.user.name}: ${request.title}` });
    }

    // Auto send direct chat message to employee when resolved by developer/team
    if (request.employee_id && req.user.id !== request.employee_id) {
      try {
        await pool.query(
          `INSERT INTO messages (sender_id, receiver_id, body) VALUES ($1,$2,$3)`,
          [
            req.user.id,
            request.employee_id,
            `✅ Your Developer Request "${request.title || 'Technical Issue'}" has been marked RESOLVED!\n\nResolution Details: ${message}`,
          ]
        );
      } catch (e) {
        console.error('Failed to send auto chat message on resolve', e);
      }
    }

    await logAudit({ userId: req.user.id, action: 'devreq_resolved', entityType: 'dev_request', entityId: request.id, req });
    res.json({ success: true, request: rows[0] });
  } catch (err) { next(err); }
}

// POST /api/dev-requests/:id/comments  (anyone with access)
async function addComment(req, res, next) {
  try {
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(422).json({ success: false, message: 'Message cannot be empty' });
    if (message.length > 2000) return res.status(422).json({ success: false, message: 'Message is too long' });
    const r = await pool.query('SELECT * FROM dev_requests WHERE id=$1', [req.params.id]);
    const request = r.rows[0];
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (!(await canAccess(req.user, request))) return res.status(403).json({ success: false, message: 'Access denied' });

    await pool.query(
      `INSERT INTO dev_request_events (request_id, actor_id, actor_role, action, message) VALUES ($1,$2,$3,'commented',$4)`,
      [request.id, req.user.id, req.user.role, message]
    );
    const people = new Set([request.employee_id, request.team_lead_id, request.developer_id].filter(Boolean));
    for (const uid of people) {
      if (uid !== req.user.id) await notify({ userId: uid, title: 'New comment on request', message: `${req.user.name}: ${message.slice(0, 60)}` });
    }
    await logAudit({ userId: req.user.id, action: 'devreq_comment', entityType: 'dev_request', entityId: request.id, req });
    res.status(201).json({ success: true });
  } catch (err) { next(err); }
}

// GET /api/dev-requests   role-scoped list  ?status=&category=&search=
async function listRequests(req, res, next) {
  try {
    const conds = [];
    const params = [];
    let i = 1;
    if (req.user.role === 'employee') { conds.push(`r.employee_id=$${i++}`); params.push(req.user.id); }
    else if (req.user.role === 'team_lead') { conds.push(`r.team_lead_id=$${i++}`); params.push(req.user.id); }
    else if (req.user.role === 'developer') {
      conds.push(`(r.developer_id=$${i} OR r.developer_id IS NULL)`);
      params.push(req.user.id);
      i++;
    }
    // admin/super_admin -> all

    if (req.query.status) { conds.push(`r.status=$${i++}`); params.push(req.query.status); }
    if (req.query.category && CATEGORIES.includes(req.query.category)) {
      conds.push(`r.category=$${i++}`);
      params.push(req.query.category);
    }
    if (req.query.search) {
      conds.push(`(r.title ILIKE $${i} OR r.client_name ILIKE $${i} OR e.name ILIKE $${i})`);
      params.push(`%${req.query.search.trim()}%`);
      i++;
    }
    if (req.query.from) { conds.push(`r.created_at >= $${i++}`); params.push(req.query.from); }
    if (req.query.to) { conds.push(`r.created_at <= $${i++}`); params.push(req.query.to); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT r.*, e.name AS employee_name, tl.name AS team_lead_name, d.name AS developer_name, t.name AS team_name
       FROM dev_requests r
       LEFT JOIN users e ON e.id=r.employee_id
       LEFT JOIN users tl ON tl.id=r.team_lead_id
       LEFT JOIN users d ON d.id=r.developer_id
       LEFT JOIN teams t ON t.id=r.team_id
       ${where} ORDER BY r.updated_at DESC`,
      params
    );
    res.json({ success: true, count: rows.length, requests: rows });
  } catch (err) { next(err); }
}

// GET /api/dev-requests/export -> CSV
async function exportCSV(req, res, next) {
  try {
    const conds = [];
    const params = [];
    let i = 1;
    if (req.user.role === 'team_lead') { conds.push(`r.team_lead_id=$${i++}`); params.push(req.user.id); }
    else if (req.user.role === 'developer') { conds.push(`r.developer_id=$${i++}`); params.push(req.user.id); }
    else if (req.user.role === 'employee') { conds.push(`r.employee_id=$${i++}`); params.push(req.user.id); }

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
      `SELECT r.id, r.title, r.client_name, r.category, r.priority, r.status, r.hours_spent, r.due_date,
              r.created_at, r.resolved_at, e.name AS employee_name, tl.name AS team_lead_name, d.name AS developer_name
       FROM dev_requests r
       LEFT JOIN users e ON e.id=r.employee_id
       LEFT JOIN users tl ON tl.id=r.team_lead_id
       LEFT JOIN users d ON d.id=r.developer_id
       ${where} ORDER BY r.created_at DESC`,
      params
    );

    const headers = ['ID', 'Title', 'Client', 'Category', 'Priority', 'Status', 'Employee', 'Team Lead', 'Developer', 'Hours Spent', 'Due Date', 'Created At', 'Resolved At'];
    const csvLines = [headers.join(',')];

    for (const r of rows) {
      const escape = (v) => `"${String(v === null || v === undefined ? '' : v).replace(/"/g, '""')}"`;
      csvLines.push([
        r.id,
        escape(r.title),
        escape(r.client_name),
        escape(r.category),
        escape(r.priority),
        escape(r.status),
        escape(r.employee_name),
        escape(r.team_lead_name),
        escape(r.developer_name),
        r.hours_spent || 0,
        escape(safeDateOnly(r.due_date)),
        escape(safeIso(r.created_at)),
        escape(safeIso(r.resolved_at)),
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=dev-requests.csv');
    res.send(csvLines.join('\n'));
  } catch (err) { next(err); }
}

// GET /api/dev-requests/:id   detail + events
async function getRequest(req, res, next) {
  try {
    const r = await pool.query(
      `SELECT r.*, e.name AS employee_name, tl.name AS team_lead_name, d.name AS developer_name, t.name AS team_name
       FROM dev_requests r
       LEFT JOIN users e ON e.id=r.employee_id
       LEFT JOIN users tl ON tl.id=r.team_lead_id
       LEFT JOIN users d ON d.id=r.developer_id
       LEFT JOIN teams t ON t.id=r.team_id
       WHERE r.id=$1`, [req.params.id]
    );
    const request = r.rows[0];
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (!(await canAccess(req.user, request))) return res.status(403).json({ success: false, message: 'Access denied' });
    const events = await pool.query(
      `SELECT ev.*, u.name AS actor_name FROM dev_request_events ev
       LEFT JOIN users u ON u.id=ev.actor_id WHERE ev.request_id=$1 ORDER BY ev.created_at ASC`,
      [req.params.id]
    );
    res.json({ success: true, request, events: events.rows });
  } catch (err) { next(err); }
}

// DELETE /api/dev-requests/:id
async function deleteRequest(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM dev_requests WHERE id=$1', [req.params.id]);
    const request = r.rows[0];
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    const isCreator = request.employee_id === req.user.id;
    const isTL = req.user.role === 'team_lead' && request.team_lead_id === req.user.id;
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role);

    if (!isCreator && !isTL && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only creator, assigned team lead, or admin can delete this request' });
    }

    await pool.query('DELETE FROM dev_request_events WHERE request_id=$1', [req.params.id]);
    await pool.query('DELETE FROM dev_requests WHERE id=$1', [req.params.id]);

    await logAudit({ userId: req.user.id, action: 'devreq_deleted', entityType: 'dev_request', entityId: req.params.id, req });
    res.json({ success: true, message: 'Developer request deleted successfully' });
  } catch (err) { next(err); }
}

module.exports = {
  listDevelopers, createRequest, forwardToDeveloper, startProgress, submitForQA,
  tlReject, reopenRequest, resolveRequest, addComment, listRequests, getRequest, exportCSV, deleteRequest,
};

