const path = require('path');
const fs = require('fs');
const { pool } = require('../config/db');
const { canAccessReport } = require('./reportController');
const { logAudit } = require('../utils/audit');

// POST /api/reports/:id/attachments   (multipart, field: files)
async function uploadAttachments(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
    const report = r.rows[0];
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    // sirf report ka owner (employee) attach kare, apne editable state me
    if (report.employee_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only report owner can attach files' });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }
    const inserted = [];
    for (const file of req.files) {
      const { rows } = await pool.query(
        `INSERT INTO report_attachments (report_id, file_name, stored_name, file_path, file_size, mime_type, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, file_name, file_size, mime_type, created_at`,
        [report.id, file.originalname, file.filename, file.path, file.size, file.mimetype, req.user.id]
      );
      inserted.push(rows[0]);
    }
    await logAudit({ userId: req.user.id, action: 'attachments_uploaded', entityType: 'report', entityId: report.id, details: { count: inserted.length }, req });
    res.status(201).json({ success: true, attachments: inserted });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/:id/attachments/:attId/download
async function downloadAttachment(req, res, next) {
  try {
    const r = await pool.query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
    const report = r.rows[0];
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    if (!(await canAccessReport(req.user, report))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const a = await pool.query(
      'SELECT * FROM report_attachments WHERE id = $1 AND report_id = $2',
      [req.params.attId, req.params.id]
    );
    const att = a.rows[0];
    if (!att) return res.status(404).json({ success: false, message: 'Attachment not found' });
    let abs = path.resolve(att.file_path);
    if (!fs.existsSync(abs)) {
      const fallback = path.join(__dirname, '..', '..', 'uploads', att.stored_name);
      if (fs.existsSync(fallback)) {
        abs = fallback;
      } else {
        return res.status(410).json({ success: false, message: 'File missing on server' });
      }
    }
    res.download(abs, att.file_name);
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadAttachments, downloadAttachment };
