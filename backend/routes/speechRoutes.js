const express = require('express');
const router = express.Router();
const speechController = require('../controllers/speechController');
const { authenticateToken } = require('../middleware/auth');

// 生成语音
router.post('/generate-speech', authenticateToken, speechController.generateSpeech);

// 下载音频文件
router.get('/download/:fileName', speechController.downloadAudio);

// 获取用户历史记录
router.get('/history', authenticateToken, speechController.getHistory);

module.exports = router;