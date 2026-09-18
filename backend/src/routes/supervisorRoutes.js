const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const supervisorCtrl = require('../controllers/supervisorController');

const router = express.Router();

router.use(authenticate);
router.use(authorize('supervisor', 'admin', 'super_admin'));

router.get('/files', supervisorCtrl.getAllFiles);
router.get('/team-overview', supervisorCtrl.getTeamOverview);

module.exports = router;
