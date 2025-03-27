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
        
        console.log('开始下载文件:', {
            username,
            filename,
            ossPath,
            headers: req.headers
        });
        
        // 从 OSS 获取文件
        const response = await axios.get(`https://oss.2000gallery.art/${ossPath}`, {
            responseType: 'arraybuffer',
            headers: {
                'Accept': 'audio/wav',
                'Origin': 'https://tts.2000gallery.art'
            }
        });
        
        console.log('OSS响应状态:', response.status);
        
        // 设置响应头
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);
        res.setHeader('Access-Control-Allow-Origin', 'https://tts.2000gallery.art');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        
        // 发送文件内容
        res.send(response.data);
        
        console.log('文件发送完成');
    } catch (error) {
        console.error('下载文件失败:', {
            error: error.message,
            code: error.code,
            stack: error.stack,
            response: error.response?.data
        });
        
        res.status(500).json({ 
            error: '下载文件失败',
            message: error.message,
            code: error.code
        });
    }
});

module.exports = router;