import express from 'express';
import { getOSSClient } from '../utils/ossUtils.js';
import { generateSpeech, getHistory, downloadAudio } from '../controllers/speechController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 获取OSS客户端实例
const client = getOSSClient();

// 生成语音
router.post('/generate-speech', authenticateToken, generateSpeech);

// 获取用户历史记录
router.get('/history', authenticateToken, getHistory);

// 获取文件下载URL
router.get('/download/:fileName', async (req, res) => {
    try {
        const { fileName } = req.params;
        const { username } = req.query;
        
        // 构建OSS路径
        const ossPath = `audio/${username}/${fileName}`;
        
        // 生成签名URL
        const url = client.signatureUrl(ossPath, {
            expires: 3600, // URL有效期1小时
            method: 'GET'
        });
        
        res.json({
            success: true,
            url
        });
    } catch (error) {
        console.error('获取下载URL失败:', error);
        res.status(500).json({
            success: false,
            message: '获取下载URL失败',
            error: error.message
        });
    }
});

export default router;