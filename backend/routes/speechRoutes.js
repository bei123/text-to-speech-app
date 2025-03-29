const express = require('express');
const router = express.Router();
const speechController = require('../controllers/speechController');
const { authenticateToken } = require('../middleware/auth');
const { uploadToOSS, deleteFromOSS } = require('../utils/ossUtils');

// 生成语音
router.post('/generate-speech', authenticateToken, speechController.generateSpeech);

// 获取用户历史记录
router.get('/history', authenticateToken, speechController.getHistory);

module.exports = router;