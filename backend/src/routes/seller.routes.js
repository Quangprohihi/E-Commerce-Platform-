const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const sellerController = require('../controllers/seller.controller');

const router = express.Router();

router.put(
  '/profile/address',
  authMiddleware,
  requireRole('SELLER', 'ADMIN'),
  sellerController.updateWarehouseAddress
);

module.exports = router;
