const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/chatController');

const router = express.Router();
router.use(authenticate);

router.get('/contacts', ctrl.contacts);
router.get('/unread-count', ctrl.unreadCount);
router.get('/:userId/messages', ctrl.conversation);
router.post('/:userId', ctrl.sendMessage);

module.exports = router;
