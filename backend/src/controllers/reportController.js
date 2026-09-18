const { pool } = require('../config/db');
const { logAudit } = require('../utils/audit');
const { notify } = require('../utils/notify');

const REPORT_COLS = `
  id, employee_id, team_id, team_lead_id, title, report_date, priority,
  task_done, hours_worked, work_status, remarks, challenges, next_day_plan,
  keywords, backlinks_created, onpage_work, offpage_work, ranking_change,
  client_name, project_name, website_url,
  service_pages, blog_pages,
  backlinks_classified, backlinks_guest_post, backlinks_blog_post, backlinks_article_post,
  backlink_urls,
  status, current_level, submitted_at, created_at, updated_at`;

const PRIORITIES = ['low', 'medium', 'high'];

// ---- helper: report body fields nikalo ----
function pickReportFields(b) {
  const n = (v) => Math.max(0, parseInt(v, 10) || 0);
  const classified = n(b.backlinks_classified);
  const guest = n(b.backlinks_guest_post);
  const blog = n(b.backlinks_blog_post);
  const article = n(b.backlinks_article_post);
  const totalBacklinks = classified + guest + blog + article;
  return {
    title: b.title,
    report_date: b.report_date || null,
    priority: PRIORITIES.includes(b.priority) ? b.priority : 'medium',
    task_done: b.task_done || null,
    hours_worked: b.hours_worked ?? null,
    work_status: b.work_status || null,
    remarks: b.remarks || null,
    challenges: b.challenges || null,
    next_day_plan: b.next_day_plan || null,
    keywords: b.keywords || null,
    // backlinks_created = sum of the 4 types (falls back to given value if types absent)
    backlinks_created: totalBacklinks || (b.backlinks_created ?? 0),
    onpage_work: b.onpage_work || null,
    offpage_work: b.offpage_work || null,
    ranking_change: b.ranking_change || null,
    client_name: b.client_name || null,
    project_name: b.project_name || null,
    website_url: b.website_url || null,
    // ---- new SEO fields ----
    service_pages: b.service_pages || null,
    blog_pages: b.blog_pages || null,
    backlinks_classified: classified,
    backlinks_guest_post: guest,
    backlinks_blog_post: blog,
    backlinks_article_post: article,
    backlink_urls: typeof b.backlink_urls === 'object' ? JSON.stringify(b.backlink_urls) : (b.backlink_urls || null),
  };
}

// ---- helper: kya ye user is report ko dekh sakta hai? ----
async function canAccessReport(user, report) {
  if (['super_admin', 'supervisor'].includes(user.role)) return true;
  if (user.role === 'admin') {
    return ['forwarded', 'admin_approved', 'admin_rejected'].includes(report.status);
  }
  if (user.role === 'team_lead') {
    return report.team_lead_id === user.id;
  }
  // employee
  return report.employee_id === user.id;
}

// runs fn(client) inside a transaction (BEGIN/COMMIT, ROLLBACK on error)
// -> status-change + its history row are written together (all-or-nothing)
async function withTx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// POST /api/reports   (employee) -> draft ya direct submit
async function createReport(req, res, next) {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({ success: false, message: 'Only employees can create reports' });
    }
    if (!req.user.team_id) {
      return res.status(422).json({ success: false, message: 'You are not assigned to any team yet. Contact admin.' });
    }
    const f = pickReportFields(req.body);
    const submit = req.body.submit === true;

    // team ka lead pata karo
    const team = await pool.query('SELECT team_lead_id FROM teams WHERE id = $1', [req.user.team_id]);
    const teamLeadId = team.rows[0]?.team_lead_id || null;

    const status = submit ? 'submitted' : 'draft';
    const level = submit ? 'team_lead' : 'employee';

    const { rows } = await pool.query(
      `INSERT INTO reports
        (employee_id, team_id, team_lead_id, title, report_date, priority, task_done, hours_worked, work_status, remarks,
         challenges, next_day_plan, keywords, backlinks_created, onpage_work, offpage_work, ranking_change,
         client_name, project_name, website_url,
         service_pages, blog_pages, backlinks_classified, backlinks_guest_post, backlinks_blog_post, backlinks_article_post,
         backlink_urls,
         status, current_level, submitted_at)
       VALUES ($1,$2,$3,$4,COALESCE($5,CURRENT_DATE),$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,${submit ? 'now()' : 'NULL'})
       RETURNING ${REPORT_COLS}`,
      [
        req.user.id, req.user.team_id, teamLeadId, f.title, f.report_date, f.priority, f.task_done, f.hours_worked,
        f.work_status, f.remarks, f.challenges, f.next_day_plan, f.keywords, f.backlinks_created, f.onpage_work, f.offpage_work,
        f.ranking_change, f.client_name, f.project_name, f.website_url,
        f.service_pages, f.blog_pages, f.backlinks_classified, f.backlinks_guest_post, f.backlinks_blog_post, f.backlinks_article_post,
        f.backlink_urls,
        status, level,
      ]
    );
    const report = rows[0];

    await pool.query(
      `INSERT INTO report_actions (report_id, action_by, action_by_role, action, from_level, to_level, comment)
       VALUES ($1,$2,'employee',$3,'employee',$4,$5)`,
      [report.id, req.user.id, submit ? 'submitted' : 'created', level, submit ? 'Report submitted to team lead' : 'Draft created']
    );

    if (submit && teamLeadId) {
      await notify({ userId: teamLeadId, title: 'New report submitted', message: `${req.user.name} submitted a report: ${f.title}`, reportId: report.id });
    }
    await logAudit({ userId: req.user.id, action: submit ? 'report_submitted' : 'report_drafted', entityType: 'report', entityId: report.id, req });
    res.status(201).json({ success: true, report });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/reports/:id  (employee edits own draft or rejected report)
async function updateReport(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
    const report = r.rows[0];
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    if (report.employee_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only edit your own reports' });
    }
    if (!['draft', 'tl_rejected'].includes(report.status)) {
      return res.status(409).json({ success: false, message: 'Only draft or returned reports can be edited' });
    }
    const f = pickReportFields({ ...report, ...req.body });
    const { rows } = await pool.query(
      `UPDATE reports SET title=$1, report_date=COALESCE($2,report_date), priority=$3, task_done=$4, hours_worked=$5,
        work_status=$6, remarks=$7, challenges=$8, next_day_plan=$9, keywords=$10, backlinks_created=$11,
        onpage_work=$12, offpage_work=$13, ranking_change=$14, client_name=$15, project_name=$16, website_url=$17,
        service_pages=$18, blog_pages=$19, backlinks_classified=$20, backlinks_guest_post=$21, backlinks_blog_post=$22, backlinks_article_post=$23,
        backlink_urls=$24,
        updated_at=now()
       WHERE id=$25 RETURNING ${REPORT_COLS}`,
      [f.title, f.report_date, f.priority, f.task_done, f.hours_worked, f.work_status, f.remarks,
       f.challenges, f.next_day_plan, f.keywords, f.backlinks_created, f.onpage_work, f.offpage_work,
       f.ranking_change, f.client_name, f.project_name, f.website_url,
       f.service_pages, f.blog_pages, f.backlinks_classified, f.backlinks_guest_post, f.backlinks_blog_post, f.backlinks_article_post,
       f.backlink_urls,
       req.params.id]
    );
    res.json({ success: true, report: rows[0] });
  } catch (err) {
    next(err);
  }
}

// POST /api/reports/:id/submit  (employee submits draft or resubmits rejected)
async function submitReport(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
    const report = r.rows[0];
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    if (report.employee_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your report' });
    }
    if (!['draft', 'tl_rejected'].includes(report.status)) {
      return res.status(409).json({ success: false, message: 'Report cannot be submitted in its current state' });
    }
    // fresh team lead
    const team = await pool.query('SELECT team_lead_id FROM teams WHERE id = $1', [report.team_id]);
    const teamLeadId = team.rows[0]?.team_lead_id || null;

    const out = await withTx(async (client) => {
      const upd = await client.query(
        `UPDATE reports SET status='submitted', current_level='team_lead', team_lead_id=$1, submitted_at=now(), updated_at=now()
         WHERE id=$2 AND employee_id=$3 AND status IN ('draft','tl_rejected') RETURNING ${REPORT_COLS}`,
        [teamLeadId, req.params.id, req.user.id]
      );
      if (upd.rowCount === 0) return null;
      await client.query(
        `INSERT INTO report_actions (report_id, action_by, action_by_role, action, from_level, to_level, comment)
         VALUES ($1,$2,'employee','submitted','employee','team_lead',$3)`,
        [report.id, req.user.id, 'Submitted to team lead']
      );
      return upd.rows[0];
    });
    if (!out) return res.status(409).json({ success: false, message: 'Report state changed — please refresh' });
    if (teamLeadId) {
      await notify({ userId: teamLeadId, title: 'Report submitted', message: `${req.user.name} submitted a report`, reportId: report.id });
    }
    await logAudit({ userId: req.user.id, action: 'report_submitted', entityType: 'report', entityId: report.id, req });
    res.json({ success: true, report: out });
  } catch (err) {
    next(err);
  }
}

// ---- Team Lead: forward to admin ----
// POST /api/reports/:id/forward   { comment }
async function forwardReport(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
    const report = r.rows[0];
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    if (req.user.role !== 'team_lead' || report.team_lead_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the assigned team lead can forward this report' });
    }
    if (!['submitted', 'admin_rejected'].includes(report.status)) {
      return res.status(409).json({ success: false, message: 'Only submitted reports can be forwarded' });
    }
    const out = await withTx(async (client) => {
      const upd = await client.query(
        `UPDATE reports SET status='forwarded', current_level='admin', updated_at=now()
         WHERE id=$1 AND team_lead_id=$2 AND status IN ('submitted','admin_rejected') RETURNING ${REPORT_COLS}`,
        [req.params.id, req.user.id]
      );
      if (upd.rowCount === 0) return null;
      await client.query(
        `INSERT INTO report_actions (report_id, action_by, action_by_role, action, from_level, to_level, comment)
         VALUES ($1,$2,'team_lead','forwarded','team_lead','admin',$3)`,
        [report.id, req.user.id, req.body.comment || 'Forwarded to admin']
      );
      return upd.rows[0];
    });
    if (!out) return res.status(409).json({ success: false, message: 'Report already actioned — please refresh' });
    const rows = [out];
    // sabhi admins ko notify
    const admins = await pool.query("SELECT id FROM users WHERE role = 'admin' AND is_active = TRUE");
    for (const a of admins.rows) {
      await notify({ userId: a.id, title: 'Report forwarded', message: `${req.user.name} forwarded a report`, reportId: report.id });
    }
    await logAudit({ userId: req.user.id, action: 'report_forwarded', entityType: 'report', entityId: report.id, req });
    res.json({ success: true, report: rows[0] });
  } catch (err) {
    next(err);
  }
}

// ---- Team Lead: reject back to employee ----
// POST /api/reports/:id/reject   { comment }  (team lead)
async function tlReject(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
    const report = r.rows[0];
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    if (req.user.role !== 'team_lead' || report.team_lead_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the assigned team lead can reject this report' });
    }
    if (report.status !== 'submitted') {
      return res.status(409).json({ success: false, message: 'Only submitted reports can be returned' });
    }
    const out = await withTx(async (client) => {
      const upd = await client.query(
        `UPDATE reports SET status='tl_rejected', current_level='employee', updated_at=now()
         WHERE id=$1 AND team_lead_id=$2 AND status='submitted' RETURNING ${REPORT_COLS}`,
        [req.params.id, req.user.id]
      );
      if (upd.rowCount === 0) return null;
      await client.query(
        `INSERT INTO report_actions (report_id, action_by, action_by_role, action, from_level, to_level, comment)
         VALUES ($1,$2,'team_lead','rejected','team_lead','employee',$3)`,
        [report.id, req.user.id, req.body.comment || 'Returned for revision']
      );
      return upd.rows[0];
    });
    if (!out) return res.status(409).json({ success: false, message: 'Report already actioned — please refresh' });
    const rows = [out];
    await notify({ userId: report.employee_id, title: 'Report returned', message: `Team lead returned the report: ${req.body.comment || 'please revise'}`, reportId: report.id });
    await logAudit({ userId: req.user.id, action: 'report_tl_rejected', entityType: 'report', entityId: report.id, req });
    res.json({ success: true, report: rows[0] });
  } catch (err) {
    next(err);
  }
}

// ---- Admin: approve ----
// POST /api/reports/:id/approve  { comment }  (admin)
async function adminApprove(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
    const report = r.rows[0];
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    if (report.status !== 'forwarded') {
      return res.status(409).json({ success: false, message: 'Only forwarded reports can be approved' });
    }
    const out = await withTx(async (client) => {
      const upd = await client.query(
        `UPDATE reports SET status='admin_approved', current_level='admin', updated_at=now()
         WHERE id=$1 AND status='forwarded' RETURNING ${REPORT_COLS}`,
        [req.params.id]
      );
      if (upd.rowCount === 0) return null;
      await client.query(
        `INSERT INTO report_actions (report_id, action_by, action_by_role, action, from_level, to_level, comment)
         VALUES ($1,$2,'admin','approved','admin','admin',$3)`,
        [report.id, req.user.id, req.body.comment || 'Approved by admin']
      );
      return upd.rows[0];
    });
    if (!out) return res.status(409).json({ success: false, message: 'Report already actioned by someone — please refresh' });
    const rows = [out];
    await notify({ userId: report.team_lead_id, title: 'Report approved', message: 'Admin approved the report', reportId: report.id });
    await notify({ userId: report.employee_id, title: 'Report approved', message: 'Your report was approved by admin', reportId: report.id });
    await logAudit({ userId: req.user.id, action: 'report_admin_approved', entityType: 'report', entityId: report.id, req });
    res.json({ success: true, report: rows[0] });
  } catch (err) {
    next(err);
  }
}

// ---- Admin: reject back to team lead ----
// POST /api/reports/:id/admin-reject  { comment }
async function adminReject(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
    const report = r.rows[0];
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    if (report.status !== 'forwarded') {
      return res.status(409).json({ success: false, message: 'Only forwarded reports can be rejected' });
    }
    const out = await withTx(async (client) => {
      const upd = await client.query(
        `UPDATE reports SET status='admin_rejected', current_level='team_lead', updated_at=now()
         WHERE id=$1 AND status='forwarded' RETURNING ${REPORT_COLS}`,
        [req.params.id]
      );
      if (upd.rowCount === 0) return null;
      await client.query(
        `INSERT INTO report_actions (report_id, action_by, action_by_role, action, from_level, to_level, comment)
         VALUES ($1,$2,'admin','rejected','admin','team_lead',$3)`,
        [report.id, req.user.id, req.body.comment || 'Returned to team lead']
      );
      return upd.rows[0];
    });
    if (!out) return res.status(409).json({ success: false, message: 'Report already actioned by someone — please refresh' });
    const rows = [out];
    await notify({ userId: report.team_lead_id, title: 'Report returned by admin', message: req.body.comment || 'Admin returned the report', reportId: report.id });
    await logAudit({ userId: req.user.id, action: 'report_admin_rejected', entityType: 'report', entityId: report.id, req });
    res.json({ success: true, report: rows[0] });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports   role-scoped list  ?status=&team_id=&employee_id=&from=&to=
async function listReports(req, res, next) {
  try {
    const { status, team_id, employee_id, from, to } = req.query;
    const conds = [];
    const params = [];
    let i = 1;

    // role scoping (data isolation)
    if (req.user.role === 'employee') {
      conds.push(`r.employee_id = $${i++}`); params.push(req.user.id);
    } else if (req.user.role === 'team_lead') {
      conds.push(`r.team_lead_id = $${i++}`); params.push(req.user.id);
    } else if (req.user.role === 'admin') {
      conds.push(`r.status IN ('forwarded','admin_approved','admin_rejected')`);
    }
    // super_admin -> no scope, sab dikhega

    if (status) { conds.push(`r.status = $${i++}`); params.push(status); }
    if (team_id) { conds.push(`r.team_id = $${i++}`); params.push(team_id); }
    if (employee_id) { conds.push(`r.employee_id = $${i++}`); params.push(employee_id); }
    if (from) { conds.push(`r.report_date >= $${i++}`); params.push(from); }
    if (to) { conds.push(`r.report_date <= $${i++}`); params.push(to); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT r.*, e.name AS employee_name, tl.name AS team_lead_name, t.name AS team_name
       FROM reports r
       LEFT JOIN users e ON e.id = r.employee_id
       LEFT JOIN users tl ON tl.id = r.team_lead_id
       LEFT JOIN teams t ON t.id = r.team_id
       ${where} ORDER BY r.updated_at DESC`,
      params
    );
    res.json({ success: true, count: rows.length, reports: rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/:id   (full detail + chain + attachments)
async function getReport(req, res, next) {
  try {
    const r = await pool.query(
      `SELECT r.*, e.name AS employee_name, tl.name AS team_lead_name, t.name AS team_name
       FROM reports r
       LEFT JOIN users e ON e.id = r.employee_id
       LEFT JOIN users tl ON tl.id = r.team_lead_id
       LEFT JOIN teams t ON t.id = r.team_id
       WHERE r.id = $1`,
      [req.params.id]
    );
    const report = r.rows[0];
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    if (!(await canAccessReport(req.user, report))) {
      return res.status(403).json({ success: false, message: 'Access denied to this report' });
    }
    const actions = await pool.query(
      `SELECT ra.*, u.name AS action_by_name FROM report_actions ra
       LEFT JOIN users u ON u.id = ra.action_by WHERE ra.report_id = $1 ORDER BY ra.created_at ASC`,
      [req.params.id]
    );
    const attachments = await pool.query(
      'SELECT id, file_name, file_size, mime_type, created_at FROM report_attachments WHERE report_id = $1',
      [req.params.id]
    );
    const comments = await pool.query(
      `SELECT c.*, u.name AS user_name FROM report_comments c
       LEFT JOIN users u ON u.id = c.user_id WHERE c.report_id = $1 ORDER BY c.created_at ASC`,
      [req.params.id]
    );
    res.json({ success: true, report, actions: actions.rows, attachments: attachments.rows, comments: comments.rows });
  } catch (err) {
    next(err);
  }
}

// POST /api/reports/:id/comments   { message }  -> koi bhi jise report ka access hai
async function addComment(req, res, next) {
  try {
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(422).json({ success: false, message: 'Message cannot be empty' });
    if (message.length > 2000) return res.status(422).json({ success: false, message: 'Message is too long' });

    const r = await pool.query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
    const report = r.rows[0];
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    if (!(await canAccessReport(req.user, report))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { rows } = await pool.query(
      `INSERT INTO report_comments (report_id, user_id, user_role, message)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [report.id, req.user.id, req.user.role, message]
    );
    const comment = { ...rows[0], user_name: req.user.name };

    // report ke sabhi participants ko notify (khud ko chhod ke)
    const people = new Set([report.employee_id, report.team_lead_id].filter(Boolean));
    for (const uid of people) {
      if (uid !== req.user.id) {
        await notify({ userId: uid, title: 'New comment', message: `${req.user.name}: ${message.slice(0, 60)}`, reportId: report.id });
      }
    }
    await logAudit({ userId: req.user.id, action: 'comment_added', entityType: 'report', entityId: report.id, req });
    res.status(201).json({ success: true, comment });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/export/csv -> filtered reports as CSV
async function exportReports(req, res, next) {
  try {
    const { status, team_id, from, to } = req.query;
    const conds = [];
    const params = [];
    let i = 1;

    if (req.user.role === 'admin') {
      conds.push(`r.status IN ('forwarded','admin_approved','admin_rejected')`);
    } else if (req.user.role === 'team_lead') {
      conds.push(`(r.team_lead_id = $${i} OR r.team_id = (SELECT team_id FROM users WHERE id = $${i}))`);
      params.push(req.user.id);
      i++;
    } else if (req.user.role === 'employee') {
      conds.push(`r.employee_id = $${i++}`);
      params.push(req.user.id);
    }

    if (status) { conds.push(`r.status = $${i++}`); params.push(status); }
    if (team_id) { conds.push(`r.team_id = $${i++}`); params.push(team_id); }
    if (from) { conds.push(`r.report_date >= $${i++}`); params.push(from); }
    if (to) { conds.push(`r.report_date <= $${i++}`); params.push(to); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT r.*, e.name AS employee, tl.name AS team_lead, t.name AS team
       FROM reports r
       LEFT JOIN users e ON e.id=r.employee_id
       LEFT JOIN users tl ON tl.id=r.team_lead_id
       LEFT JOIN teams t ON t.id=r.team_id
       ${where} ORDER BY r.report_date DESC`, params
    );

    const safeDate = (d) => {
      if (!d) return '';
      try {
        const dt = new Date(d);
        return isNaN(dt.getTime()) ? String(d).slice(0, 10) : dt.toISOString().slice(0, 10);
      } catch (e) { return String(d || '').slice(0, 10); }
    };

    const headers = ['ID','Date','Title','Priority','Status','Employee','Team Lead','Team','Client','Project','Website','Hours','Backlinks','Keywords','Task Done','Challenges','Next Plan','Remarks'];
    const esc = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push([
        r.id,
        safeDate(r.report_date),
        r.title,
        r.priority,
        r.status,
        r.employee,
        r.team_lead,
        r.team,
        r.client_name,
        r.project_name,
        r.website_url,
        r.hours_worked,
        r.backlinks_created,
        r.keywords,
        r.task_done,
        r.challenges,
        r.next_day_plan,
        r.remarks
      ].map(esc).join(','));
    }
    const csv = '\uFEFF' + lines.join('\n'); // BOM for UTF-8 Excel
    await logAudit({ userId: req.user.id, action: 'reports_exported', details: { count: rows.length }, req });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reports_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createReport, updateReport, submitReport,
  forwardReport, tlReject, adminApprove, adminReject,
  listReports, getReport, canAccessReport,
  addComment, exportReports,
};
