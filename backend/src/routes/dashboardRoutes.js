const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/dashboardController');

const router = express.Router();
router.use(authenticate);

router.get('/stats', ctrl.stats);
router.get('/charts', ctrl.charts);
router.get('/chain/:reportId', authorize('super_admin', 'admin'), ctrl.reportChain);
router.get('/audit', authorize('super_admin'), ctrl.auditLogs);

module.exports = router;
