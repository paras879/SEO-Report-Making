const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/teamController');

const router = express.Router();
router.use(authenticate);

router.post(
  '/',
  authorize('super_admin', 'admin'),
  [body('name').trim().notEmpty()],
  validate,
  ctrl.createTeam
);
router.get('/', authorize('super_admin', 'admin', 'team_lead'), ctrl.listTeams);
router.get('/:id', authorize('super_admin', 'admin', 'team_lead'), ctrl.getTeam);
router.patch('/:id', authorize('super_admin', 'admin'), ctrl.updateTeam);
router.post('/:id/members', authorize('super_admin', 'admin'), [body('user_id').isInt()], validate, ctrl.addMember);
router.delete('/:id/members/:userId', authorize('super_admin', 'admin'), ctrl.removeMember);

module.exports = router;
