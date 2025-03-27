const express = require('express');
const router = express.Router();
const speechController = require('../controllers/speechController');
const { authenticateToken } = require('../middleware/auth');
const { uploadToOSS, deleteFromOSS } = require('../utils/ossUtils');
const axios = require('axios');

// 生成语音
router.post('/generate-speech', authenticateToken, speechController.generateSpeech);

// 获取用户历史记录
router.get('/history', authenticateToken, speechController.getHistory);

/**
 * 代理下载文件
 */
router.get('/download/:username/:filename', async (req, res) => {
    try {
        const { username, filename } = req.params;
        const ossPath = `audio/${username}/${filename}`;
        
        // 从 OSS 获取文件
        const response = await axios.get(`https://oss.2000gallery.art/${ossPath}`, {
            responseType: 'arraybuffer'
        });
        
        // 设置响应头
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        // 发送文件内容
        res.send(response.data);
    } catch (error) {
        console.error('下载文件失败:', error);
        res.status(500).json({ error: '下载文件失败' });
    }
});

module.exports = router;