const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/designRequestController');

const router = express.Router();
router.use(authenticate);

// designers list for TL/admin to assign
router.get('/designers', authorize('team_lead', 'admin', 'super_admin'), ctrl.listDesigners);

// export CSV
router.get('/export', authorize('team_lead', 'designer', 'admin', 'super_admin', 'employee'), ctrl.exportCSV);

// list + detail
router.get('/', ctrl.listRequests);
router.get('/:id', ctrl.getRequest);

// employee single request
router.post('/', authorize('employee'), ctrl.createRequest);

// employee bulk CSV requests
router.post('/bulk-csv', authorize('employee'), ctrl.createBulkCSVRequests);

// team lead / admin assign to designer
router.post('/:id/forward', authorize('team_lead', 'admin', 'super_admin'), [body('designer_id').isInt()], validate, ctrl.forwardToDesigner);
router.post('/:id/reject', authorize('team_lead', 'admin', 'super_admin'), ctrl.tlReject);

// designer workflow
router.post('/:id/start-progress', authorize('designer', 'admin', 'super_admin'), ctrl.startProgress);
router.post('/:id/submit-qa', authorize('designer', 'admin', 'super_admin'), [body('message').trim().notEmpty()], validate, ctrl.submitForQA);

// resolve & reopen
router.post('/:id/resolve', [body('message').trim().notEmpty()], validate, ctrl.resolveRequest);
router.post('/:id/reopen', [body('message').trim().notEmpty()], validate, ctrl.reopenRequest);

// comments
router.post('/:id/comments', [body('message').trim().notEmpty()], validate, ctrl.addComment);

module.exports = router;
