const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.post('/', authMiddleware, orderController.create);
router.post('/:id/vnpay-url', authMiddleware, orderController.createVnpayUrl);
router.get('/', authMiddleware, orderController.myOrders);
router.get('/manage', authMiddleware, orderController.manageOrders);
router.get('/:id', authMiddleware, orderController.getById);
router.patch('/:id/simulate-next', authMiddleware, orderController.simulateNext);
router.patch('/:id/status', authMiddleware, orderController.updateStatus);

module.exports = router;
