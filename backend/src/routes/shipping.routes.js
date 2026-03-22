const express = require('express');
const shippingController = require('../controllers/shipping.controller');

const router = express.Router();

router.get('/provinces', shippingController.provinces);
router.get('/districts', shippingController.districts);
router.get('/wards', shippingController.wards);

module.exports = router;
