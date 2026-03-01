const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { optionalAuth } = require('../middlewares/auth.middleware');

router.post('/chat', optionalAuth, aiController.chat);
router.post('/compare', optionalAuth, aiController.compare);

module.exports = router;
