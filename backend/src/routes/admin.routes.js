const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const reportController = require('../controllers/report.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

router.use(authMiddleware, requireRole('STAFF', 'ADMIN'));

router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id', adminController.updateUserById);

router.get('/reports/summary', reportController.getSummary);
router.get('/reports/detail', reportController.getDetail);
router.get('/reports/export/excel', reportController.exportExcel);
router.get('/reports/export/pdf', reportController.exportPdf);

module.exports = router;
