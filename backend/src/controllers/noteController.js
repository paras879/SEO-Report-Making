const { pool } = require('../config/db');
const { logAudit } = require('../utils/audit');
const { notify } = require('../utils/notify');

const MAX_IMAGES = 8;
const MAX_TEXT = 20000;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;   // per image ~3MB (data URI)
const MAX_TOTAL_BYTES = 15 * 1024 * 1024;  // pura note

// content validate + clean karo
function validateContent(content) {
  if (!content || typeof content !== 'object') return { ok: false, message: 'Note content invalid' };
  const text = typeof content.text === 'string' ? content.text : '';
  const images = Array.isArray(content.images) ? content.images : [];
  if (!text.trim() && images.length === 0) return { ok: false, message: 'Note is empty — write something or add an image' };
  if (text.length > MAX_TEXT) return { ok: false, message: 'Text is too long' };
  if (images.length > MAX_IMAGES) return { ok: false, message: `Max ${MAX_IMAGES} images allowed` };
  let total = text.length;
  for (const img of images) {
    if (typeof img !== 'string' || !img.startsWith('data:image/')) return { ok: false, message: 'Only pasted images are allowed' };
    if (img.length > MAX_IMAGE_BYTES) return { ok: false, message: 'An image is too large (max ~2MB)' };
    total += img.length;
  }
  if (total > MAX_TOTAL_BYTES) return { ok: false, message: 'Note is too large, please remove some images' };
  return { ok: true, clean: { text, images } };
}

async function canAccessNote(user, note) {
  if (user.role === 'super_admin') return true;
  if (user.role === 'admin') return note.status === 'forwarded_to_admin';
  if (user.role === 'team_lead') return note.team_lead_id === user.id || note.author_id === user.id;
  return note.author_id === user.id; // employee
}

// POST /api/notes   (employee ya team_lead)  { title, content:{text,images}, send }
async function createNote(req, res, next) {
  try {
    const role = req.user.role;
    if (!['employee', 'team_lead'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Only an employee or team lead can create a note' });
    }
    const v = validateContent(req.body.content);
    if (!v.ok) return res.status(422).json({ success: false, message: v.message });
    const title = String(req.body.title || '').slice(0, 200) || null;
    const send = req.body.send !== false; // default send

    let teamLeadId = null, status = 'draft', level = 'employee';

    if (role === 'employee') {
      if (!req.user.team_id) return res.status(422).json({ success: false, message: 'You are not in any team. Please contact admin.' });
      const team = await pool.query('SELECT team_lead_id FROM teams WHERE id = $1', [req.user.team_id]);
      teamLeadId = team.rows[0]?.team_lead_id || null;
      if (send) { status = 'sent_to_tl'; level = 'team_lead'; }
    } else {
      // team_lead ka note seedha admin ko
      if (send) { status = 'forwarded_to_admin'; level = 'admin'; }
    }

    const { rows } = await pool.query(
      `INSERT INTO notes (author_id, author_role, team_id, team_lead_id, title, content, status, current_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.id, role, req.user.team_id || null, teamLeadId, title, JSON.stringify(v.clean), status, level]
    );
    const note = rows[0];

    await pool.query(
      `INSERT INTO note_events (note_id, actor_id, actor_role, action, message)
       VALUES ($1,$2,$3,$4,$5)`,
      [note.id, req.user.id, role, send ? 'sent' : 'created', null]
    );

    if (send) {
      if (role === 'employee' && teamLeadId) {
        await notify({ userId: teamLeadId, title: 'New note', message: `${req.user.name} sent a note`, });
      } else if (role === 'team_lead') {
        const admins = await pool.query("SELECT id FROM users WHERE role='admin' AND is_active=TRUE");
        for (const a of admins.rows) await notify({ userId: a.id, title: 'New note', message: `${req.user.name} (Team Lead) sent a note` });
      }
    }
    await logAudit({ userId: req.user.id, action: send ? 'note_sent' : 'note_drafted', entityType: 'note', entityId: note.id, req });
    res.status(201).json({ success: true, note });
  } catch (err) {
    next(err);
  }
}

// POST /api/notes/:id/forward   (team_lead) { message }  -> admin ko
async function forwardNote(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM notes WHERE id = $1', [req.params.id]);
    const note = r.rows[0];
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });
    if (req.user.role !== 'team_lead' || note.team_lead_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the assigned team lead can forward' });
    }
    if (note.status !== 'sent_to_tl') {
      return res.status(409).json({ success: false, message: 'This note cannot be forwarded' });
    }
    const message = String(req.body.message || '').slice(0, 5000) || null;
    const { rows } = await pool.query(
      `UPDATE notes SET status='forwarded_to_admin', current_level='admin', updated_at=now() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    await pool.query(
      `INSERT INTO note_events (note_id, actor_id, actor_role, action, message) VALUES ($1,$2,'team_lead','forwarded',$3)`,
      [note.id, req.user.id, message]
    );
    const admins = await pool.query("SELECT id FROM users WHERE role='admin' AND is_active=TRUE");
    for (const a of admins.rows) await notify({ userId: a.id, title: 'Note forwarded', message: `${req.user.name} forwarded a note to admin` });
    await logAudit({ userId: req.user.id, action: 'note_forwarded', entityType: 'note', entityId: note.id, req });
    res.json({ success: true, note: rows[0] });
  } catch (err) {
    next(err);
  }
}

// GET /api/notes   role-scoped list (content ke bina — sirf preview)
async function listNotes(req, res, next) {
  try {
    const conds = [];
    const params = [];
    let i = 1;
    if (req.user.role === 'employee') {
      conds.push(`n.author_id = $${i++}`);
      params.push(req.user.id);
    } else if (req.user.role === 'team_lead') {
      conds.push(`(n.team_lead_id = $${i} OR n.author_id = $${i})`);
      params.push(req.user.id);
      i++;
    } else if (req.user.role === 'admin') {
      conds.push(`n.status = 'forwarded_to_admin'`);
    }

    // Hide notes deleted by this specific user
    conds.push(`n.id NOT IN (SELECT note_id FROM note_deletions WHERE user_id = $${i++})`);
    params.push(req.user.id);

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT n.id, n.title, n.status, n.author_id, n.team_id, n.team_lead_id, n.created_at, n.updated_at,
              a.name AS author_name, a.role AS author_role, tl.name AS team_lead_name, t.name AS team_name,
              (n.content->>'text') AS preview,
              COALESCE(jsonb_array_length(n.content->'images'),0) AS image_count
       FROM notes n
       LEFT JOIN users a ON a.id=n.author_id
       LEFT JOIN users tl ON tl.id=n.team_lead_id
       LEFT JOIN teams t ON t.id=n.team_id
       ${where} ORDER BY n.updated_at DESC`,
      params
    );
    // preview chhota karo
    for (const r of rows) if (r.preview) r.preview = r.preview.slice(0, 140);
    res.json({ success: true, count: rows.length, notes: rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/notes/:id   full content + events
async function getNote(req, res, next) {
  try {
    // Check if the current user has deleted this note from their view
    const delCheck = await pool.query(
      'SELECT 1 FROM note_deletions WHERE note_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (delCheck.rows.length > 0) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    const r = await pool.query(
      `SELECT n.*, a.name AS author_name, tl.name AS team_lead_name, t.name AS team_name
       FROM notes n
       LEFT JOIN users a ON a.id=n.author_id
       LEFT JOIN users tl ON tl.id=n.team_lead_id
       LEFT JOIN teams t ON t.id=n.team_id
       WHERE n.id=$1`, [req.params.id]
    );
    const note = r.rows[0];
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });
    if (!(await canAccessNote(req.user, note))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const events = await pool.query(
      `SELECT e.*, u.name AS actor_name FROM note_events e
       LEFT JOIN users u ON u.id=e.actor_id WHERE e.note_id=$1 ORDER BY e.created_at ASC`,
      [req.params.id]
    );
    res.json({ success: true, note, events: events.rows });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/notes/:id (employee, team_lead, admin, super_admin)
async function deleteNote(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM notes WHERE id = $1', [req.params.id]);
    const note = r.rows[0];
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

    const isSuperOrAdmin = ['super_admin', 'admin'].includes(req.user.role);
    const isTL = req.user.role === 'team_lead' && (note.team_lead_id === req.user.id || note.author_id === req.user.id);
    const isAuthor = note.author_id === req.user.id;

    if (!isSuperOrAdmin && !isTL && !isAuthor) {
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this note' });
    }

    // Role-safe soft delete per user:
    // If SuperAdmin, Admin, Team Lead, or Employee deletes,
    // we record the deletion specifically for this user so it disappears from their view,
    // without deleting it from other roles (Admin, Team Lead, Employee).
    await pool.query(
      `INSERT INTO note_deletions (note_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (note_id, user_id) DO NOTHING`,
      [req.params.id, req.user.id]
    );

    await logAudit({
      userId: req.user.id,
      action: 'note_deleted',
      entityType: 'note',
      entityId: Number(req.params.id),
      details: {
        title: note.title,
        author_id: note.author_id,
        deleted_by_role: req.user.role,
        scope: 'user_view',
      },
      req,
    });

    res.json({ success: true, message: 'Note deleted from your view successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createNote, forwardNote, listNotes, getNote, deleteNote };
