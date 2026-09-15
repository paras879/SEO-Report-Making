const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');

const router = express.Router();
router.use(authenticate);

router.get('/', ctrl.listNotifications);
router.patch('/read-all', ctrl.markAllRead);
router.patch('/:id/read', ctrl.markRead);

module.exports = router;
