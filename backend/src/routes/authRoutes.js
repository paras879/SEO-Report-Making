const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

const router = express.Router();

// login brute-force protection (skip successful logins so testing/switching accounts is never blocked)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again later.' },
});

router.post(
  '/login',
  loginLimiter,
  [body('identifier').notEmpty(), body('password').notEmpty()],
  validate,
  ctrl.login
);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.get('/me', authenticate, ctrl.me);
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .matches(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/)
      .withMessage('Password must be at least 8 characters and contain at least 1 letter and 1 number'),
  ],
  validate,
  ctrl.changePassword
);

module.exports = router;
