const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/devRequestController');

const router = express.Router();
router.use(authenticate);

// developer list for TL/admin to assign
router.get('/developers', authorize('team_lead', 'admin', 'super_admin'), ctrl.listDevelopers);

// list + detail (role-scoped inside controller)
router.get('/', ctrl.listRequests);
router.get('/:id', ctrl.getRequest);

// employee raises a request
router.post('/', authorize('employee'), [body('title').trim().notEmpty()], validate, ctrl.createRequest);

// team lead actions
router.post('/:id/forward', authorize('team_lead'), [body('developer_id').isInt()], validate, ctrl.forwardToDeveloper);
router.post('/:id/reject', authorize('team_lead'), ctrl.tlReject);

// developer resolves
router.post('/:id/resolve', authorize('developer'), [body('message').trim().notEmpty()], validate, ctrl.resolveRequest);

// comments (anyone with access)
router.post('/:id/comments', [body('message').trim().notEmpty()], validate, ctrl.addComment);

module.exports = router;
