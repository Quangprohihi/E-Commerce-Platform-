const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');

router.get('/home', statsController.getHomeStats);

module.exports = router;
