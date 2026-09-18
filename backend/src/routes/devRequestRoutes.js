const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/devRequestController');

const router = express.Router();
router.use(authenticate);

// Guard: a non-numeric :id returns a clean 404 (never reaches the DB → no 500)
router.param('id', (req, res, next, val) => {
  if (!/^\d+$/.test(String(val))) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  next();
});

// developer list for employees/TL/admin to assign
router.get('/developers', authorize('employee', 'team_lead', 'admin', 'super_admin'), ctrl.listDevelopers);

// export CSV
router.get('/export', authorize('team_lead', 'developer', 'admin', 'super_admin', 'supervisor'), ctrl.exportCSV);

// list + detail + delete (role-scoped inside controller)
router.get('/', ctrl.listRequests);
router.get('/:id', ctrl.getRequest);
router.delete('/:id', ctrl.deleteRequest);

// employee raises a request
router.post('/', authorize('employee'), [body('title').trim().notEmpty()], validate, ctrl.createRequest);

// team lead / admin actions
router.post('/:id/forward', authorize('team_lead', 'admin', 'super_admin'), [body('developer_id').isInt()], validate, ctrl.forwardToDeveloper);
router.post('/:id/reject', authorize('team_lead', 'admin', 'super_admin'), ctrl.tlReject);

// developer workflow
router.post('/:id/start-progress', authorize('developer', 'admin', 'super_admin'), ctrl.startProgress);
router.post('/:id/submit-qa', authorize('developer', 'admin', 'super_admin'), [body('message').trim().notEmpty()], validate, ctrl.submitForQA);

// resolve & reopen
router.post('/:id/resolve', [body('message').trim().notEmpty()], validate, ctrl.resolveRequest);
router.post('/:id/reopen', [body('message').trim().notEmpty()], validate, ctrl.reopenRequest);

// comments (anyone with access)
router.post('/:id/comments', [body('message').trim().notEmpty()], validate, ctrl.addComment);

module.exports = router;

