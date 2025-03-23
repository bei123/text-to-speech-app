const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// 调用DeepSeek API
router.post('/call-deepseek', aiController.callDeepseek);

module.exports = router; 