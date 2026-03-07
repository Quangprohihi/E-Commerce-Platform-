const express = require('express');
const router = express.Router();
const withdrawalController = require('../controllers/withdrawal.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

router.use(authMiddleware, requireRole('SELLER'));

router.get('/', withdrawalController.getMyRequests);
router.get('/balance', withdrawalController.getBalance);
router.post('/', withdrawalController.createRequest);

module.exports = router;
