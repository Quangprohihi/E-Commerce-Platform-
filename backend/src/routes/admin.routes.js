const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const reportController = require('../controllers/report.controller');
const withdrawalController = require('../controllers/withdrawal.controller');
const statsController = require('../controllers/stats.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

router.use(authMiddleware, requireRole('STAFF', 'ADMIN'));

router.get('/dashboard', statsController.getDashboard);

router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id', adminController.updateUserById);
router.delete('/users/:id', adminController.deleteUserById);

router.get('/reports/summary', reportController.getSummary);
router.get('/reports/detail', reportController.getDetail);
router.get('/reports/revenue-overview', reportController.getRevenueOverview);
router.get('/reports/export/excel', reportController.exportExcel);
router.get('/reports/export/pdf', reportController.exportPdf);

router.get('/withdrawals', withdrawalController.listForAdmin);
router.get('/withdrawals/:id', withdrawalController.getByIdForAdmin);
router.patch('/withdrawals/:id', withdrawalController.updateStatus);

module.exports = router;
