const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { upload } = require('../middleware/upload');
const ctrl = require('../controllers/reportController');
const att = require('../controllers/attachmentController');

const router = express.Router();
router.use(authenticate);

// export (admin/super_admin/supervisor/team_lead/employee) — MUST be before '/:id'
router.get('/export/csv', authorize('admin', 'super_admin', 'supervisor', 'team_lead', 'employee'), ctrl.exportReports);

// list + get (role scoped inside controller)
router.get('/', ctrl.listReports);
router.get('/:id', ctrl.getReport);

// discussion comments — koi bhi jise report access hai (employee/TL/admin/super_admin)
router.post('/:id/comments', [body('message').trim().notEmpty()], validate, ctrl.addComment);

// employee actions — strong input validation
const reportValidators = [
  body('title').trim().notEmpty().withMessage('Title required').isLength({ max: 180 }),
  body('hours_worked').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0, max: 24 }).withMessage('Hours must be between 0-24'),
  body('backlinks_created').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0, max: 100000 }),
  body('website_url').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Enter a valid URL'),
  body('remarks').optional({ nullable: true }).isLength({ max: 5000 }),
  body('task_done').optional({ nullable: true }).isLength({ max: 5000 }),
  body('challenges').optional({ nullable: true }).isLength({ max: 5000 }),
  body('next_day_plan').optional({ nullable: true }).isLength({ max: 5000 }),
  body('priority').optional({ nullable: true, checkFalsy: true }).isIn(['low', 'medium', 'high']),
];
router.post('/', authorize('employee'), reportValidators, validate, ctrl.createReport);
router.patch('/:id', authorize('employee'), reportValidators, validate, ctrl.updateReport);
router.post('/:id/submit', authorize('employee'), ctrl.submitReport);

// attachments (owner employee uploads; access-controlled download for chain)
router.post('/:id/attachments', authorize('employee'), upload.array('files', 5), att.uploadAttachments);
router.get('/:id/attachments/:attId/download', att.downloadAttachment);

// team lead actions
router.post('/:id/forward', authorize('team_lead'), ctrl.forwardReport);
router.post('/:id/reject', authorize('team_lead'), ctrl.tlReject);

// admin actions
router.post('/:id/approve', authorize('admin'), ctrl.adminApprove);
router.post('/:id/admin-reject', authorize('admin'), ctrl.adminReject);

module.exports = router;
