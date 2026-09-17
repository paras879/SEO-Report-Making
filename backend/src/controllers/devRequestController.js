const { pool } = require('../config/db');
const { logAudit } = require('../utils/audit');
const { notify } = require('../utils/notify');

const REQ_COLS = `
  id, employee_id, team_id, team_lead_id, developer_id, title, description,
  sites, priority, status, current_level, resolved_at, created_at, updated_at`;

const PRIORITIES = ['low', 'medium', 'high'];

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

async function canAccess(user, r) {
  if (['super_admin', 'admin'].includes(user.role)) return true;
  if (user.role === 'team_lead') return r.team_lead_id === user.id;
  if (user.role === 'developer') return r.developer_id === user.id;
  return r.employee_id === user.id; // employee
}

// GET /api/dev-requests/developers  -> active developers (TL/admin picks one)
async function listDevelopers(req, res, next) {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, username FROM users WHERE role='developer' AND is_active=TRUE ORDER BY name"
    );
    res.json({ success: true, developers: rows });
  } catch (err) { next(err); }
}

// POST /api/dev-requests  (employee)  { title, description, priority, sites }
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

    const team = await pool.query('SELECT team_lead_id FROM teams WHERE id=$1', [req.user.team_id]);
    const teamLeadId = team.rows[0]?.team_lead_id || null;

    const { rows } = await pool.query(
      `INSERT INTO dev_requests
        (employee_id, team_id, team_lead_id, title, description, sites, priority, status, current_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'submitted','team_lead') RETURNING ${REQ_COLS}`,
      [req.user.id, req.user.team_id, teamLeadId, title, req.body.description || null, JSON.stringify(cs.sites), priority]
    );
    const request = rows[0];

    await pool.query(
      `INSERT INTO dev_request_events (request_id, actor_id, actor_role, action, message)
       VALUES ($1,$2,'employee','submitted',$3)`,
      [request.id, req.user.id, 'Request raised and sent to team lead']
    );
    if (teamLeadId) {
      await notify({ userId: teamLeadId, title: 'New developer request', message: `${req.user.name}: ${title}` });
    }
    await logAudit({ userId: req.user.id, action: 'devreq_created', entityType: 'dev_request', entityId: request.id, req });
    res.status(201).json({ success: true, request });
  } catch (err) { next(err); }
}

// POST /api/dev-requests/:id/forward  (team_lead)  { developer_id, message }
async function forwardToDeveloper(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM dev_requests WHERE id=$1', [req.params.id]);
    const request = r.rows[0];
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (req.user.role !== 'team_lead' || request.team_lead_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the assigned team lead can forward this' });
    }
    if (!['submitted', 'tl_rejected'].includes(request.status)) {
      return res.status(409).json({ success: false, message: 'This request cannot be forwarded now' });
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
       VALUES ($1,$2,'team_lead','forwarded',$3)`,
      [request.id, req.user.id, req.body.message || `Forwarded to developer ${dev.rows[0].name}`]
    );
    await notify({ userId: developerId, title: 'New request assigned', message: `${req.user.name} assigned you: ${request.title}` });
    const admins = await pool.query("SELECT id FROM users WHERE role IN ('admin','super_admin') AND is_active=TRUE");
    for (const a of admins.rows) await notify({ userId: a.id, title: 'Request forwarded to developer', message: `${req.user.name} forwarded a request to ${dev.rows[0].name}` });
    await logAudit({ userId: req.user.id, action: 'devreq_forwarded', entityType: 'dev_request', entityId: request.id, req });
    res.json({ success: true, request: rows[0] });
  } catch (err) { next(err); }
}

// POST /api/dev-requests/:id/reject  (team_lead) -> wapas employee ko  { message }
async function tlReject(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM dev_requests WHERE id=$1', [req.params.id]);
    const request = r.rows[0];
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (req.user.role !== 'team_lead' || request.team_lead_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the assigned team lead can return this' });
    }
    if (request.status !== 'submitted') {
      return res.status(409).json({ success: false, message: 'Only submitted requests can be returned' });
    }
    const { rows } = await pool.query(
      `UPDATE dev_requests SET status='tl_rejected', current_level='employee', updated_at=now() WHERE id=$1 RETURNING ${REQ_COLS}`,
      [req.params.id]
    );
    await pool.query(
      `INSERT INTO dev_request_events (request_id, actor_id, actor_role, action, message) VALUES ($1,$2,'team_lead','rejected',$3)`,
      [request.id, req.user.id, req.body.message || 'Returned for more details']
    );
    await notify({ userId: request.employee_id, title: 'Request returned', message: req.body.message || 'Team lead returned your request' });
    await logAudit({ userId: req.user.id, action: 'devreq_rejected', entityType: 'dev_request', entityId: request.id, req });
    res.json({ success: true, request: rows[0] });
  } catch (err) { next(err); }
}

// POST /api/dev-requests/:id/resolve  (developer)  { message }
async function resolveRequest(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM dev_requests WHERE id=$1', [req.params.id]);
    const request = r.rows[0];
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (req.user.role !== 'developer' || request.developer_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the assigned developer can resolve this' });
    }
    if (request.status !== 'forwarded') {
      return res.status(409).json({ success: false, message: 'This request is not open for resolving' });
    }
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(422).json({ success: false, message: 'Please add a message describing the fix' });

    const { rows } = await pool.query(
      `UPDATE dev_requests SET status='resolved', current_level='team_lead', resolved_at=now(), updated_at=now()
       WHERE id=$1 RETURNING ${REQ_COLS}`,
      [req.params.id]
    );
    await pool.query(
      `INSERT INTO dev_request_events (request_id, actor_id, actor_role, action, message) VALUES ($1,$2,'developer','resolved',$3)`,
      [request.id, req.user.id, message]
    );
    // notify team lead + employee + admins
    const targets = new Set([request.team_lead_id, request.employee_id].filter(Boolean));
    for (const uid of targets) await notify({ userId: uid, title: 'Issue resolved ✅', message: `Developer: ${message.slice(0, 60)}` });
    const admins = await pool.query("SELECT id FROM users WHERE role IN ('admin','super_admin') AND is_active=TRUE");
    for (const a of admins.rows) await notify({ userId: a.id, title: 'Developer resolved a request', message: `${req.user.name}: ${request.title}` });
    await logAudit({ userId: req.user.id, action: 'devreq_resolved', entityType: 'dev_request', entityId: request.id, req });
    res.json({ success: true, request: rows[0] });
  } catch (err) { next(err); }
}

// POST /api/dev-requests/:id/comments  (anyone with access)  { message }
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
    // notify participants (except self)
    const people = new Set([request.employee_id, request.team_lead_id, request.developer_id].filter(Boolean));
    for (const uid of people) {
      if (uid !== req.user.id) await notify({ userId: uid, title: 'New comment on request', message: `${req.user.name}: ${message.slice(0, 60)}` });
    }
    await logAudit({ userId: req.user.id, action: 'devreq_comment', entityType: 'dev_request', entityId: request.id, req });
    res.status(201).json({ success: true });
  } catch (err) { next(err); }
}

// GET /api/dev-requests   role-scoped list  ?status=
async function listRequests(req, res, next) {
  try {
    const conds = [];
    const params = [];
    let i = 1;
    if (req.user.role === 'employee') { conds.push(`r.employee_id=$${i++}`); params.push(req.user.id); }
    else if (req.user.role === 'team_lead') { conds.push(`r.team_lead_id=$${i++}`); params.push(req.user.id); }
    else if (req.user.role === 'developer') { conds.push(`r.developer_id=$${i++}`); params.push(req.user.id); }
    // admin/super_admin -> all
    if (req.query.status) { conds.push(`r.status=$${i++}`); params.push(req.query.status); }
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

module.exports = {
  listDevelopers, createRequest, forwardToDeveloper, tlReject,
  resolveRequest, addComment, listRequests, getRequest,
};
