const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/userController');

const router = express.Router();
router.use(authenticate);

router.post(
  '/',
  authorize('super_admin', 'admin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email')
      .trim()
      .matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
      .withMessage('Invalid email address format (e.g. user@domain.com)'),
    body('username').trim().isLength({ min: 3 }).withMessage('Username min 3 chars'),
    body('password')
      .matches(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/)
      .withMessage('Password must be at least 8 characters and contain at least 1 letter and 1 number'),
    body('role')
      .isIn(['admin', 'team_lead', 'employee', 'developer', 'designer', 'editor', 'supervisor'])
      .withMessage('Invalid role'),
  ],
  validate,
  ctrl.createUser
);

router.get('/', authorize('super_admin', 'admin'), ctrl.listUsers);
router.get('/:id', authorize('super_admin', 'admin'), ctrl.getUser);
router.patch('/:id', authorize('super_admin', 'admin'), ctrl.updateUser);
router.post(
  '/:id/reset-password',
  authorize('super_admin', 'admin'),
  [
    body('newPassword')
      .matches(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/)
      .withMessage('Password must be at least 8 characters and contain at least 1 letter and 1 number'),
  ],
  validate,
  ctrl.resetPassword
);
router.delete('/:id', authorize('super_admin', 'admin'), ctrl.deleteUser);

module.exports = router;
