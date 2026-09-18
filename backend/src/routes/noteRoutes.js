const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/noteController');

const router = express.Router();

// images ke liye bada body limit (global 1mb se alag)
router.use(express.json({ limit: '16mb' }));
router.use(authenticate);

// Guard: a non-numeric :id returns a clean 404 (never reaches the DB → no 500)
router.param('id', (req, res, next, val) => {
  if (!/^\d+$/.test(String(val))) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  next();
});

// spam se bachav
const createLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

router.get('/', ctrl.listNotes);
router.get('/:id', ctrl.getNote);
router.post('/', authorize('employee', 'team_lead'), createLimiter, ctrl.createNote);
router.post('/:id/forward', authorize('team_lead'), ctrl.forwardNote);
router.delete('/:id', ctrl.deleteNote);

module.exports = router;
