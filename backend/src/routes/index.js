// routes/index.js - mount all routes
const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const productRoutes = require('./product.routes');
const orderRoutes = require('./order.routes');
const paymentRoutes = require('./payment.routes');
const aiRoutes = require('./ai.routes');
const reviewRoutes = require('./review.routes');
const adminRoutes = require('./admin.routes');
const statsRoutes = require('./stats.routes');
const categoryRoutes = require('./category.routes');
const withdrawalRoutes = require('./withdrawal.routes');
const shippingRoutes = require('./shipping.routes');
const sellerRoutes = require('./seller.routes');

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/payment', paymentRoutes);
router.use('/ai', aiRoutes);
router.use('/reviews', reviewRoutes);
router.use('/admin', adminRoutes);
router.use('/stats', statsRoutes);
router.use('/withdrawals', withdrawalRoutes);
router.use('/shipping', shippingRoutes);
router.use('/seller', sellerRoutes);

module.exports = router;
