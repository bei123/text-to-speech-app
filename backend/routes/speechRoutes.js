const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const speechController = require('../controllers/speechController');
const { authenticateToken } = require('../middleware/auth');
const { uploadToOSS, deleteFromOSS } = require('../utils/ossUtils');
const { TEMP_DIR } = require('../utils/constants');

// 配置 multer 用于文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, TEMP_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'ref_' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 限制文件大小为 50MB
    },
    fileFilter: function (req, file, cb) {
        // 只允许音频文件
        const allowedMimes = ['audio/wav', 'audio/wave', 'audio/x-wav', 'audio/mpeg', 'audio/mp3'];
        if (allowedMimes.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.wav')) {
            cb(null, true);
        } else {
            cb(new Error('只允许上传音频文件 (WAV, MP3)'));
        }
    }
});

// 生成语音
router.post('/generate-speech', authenticateToken, speechController.generateSpeech);

// 使用参考音频生成语音 (v2ProPlus)
// 注意：文件上传是可选的，如果使用预设（ref_audio_url），则不需要上传文件
router.post('/v2proplus', authenticateToken, (req, res, next) => {
    // 如果提供了 ref_audio_url（使用预设），跳过文件上传
    if (req.body.ref_audio_url) {
        return next();
    }
    
    // 否则，处理文件上传
    upload.single('ref_wav_file')(req, res, (err) => {
        if (err) {
            console.error('文件上传错误:', err);
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ message: '文件大小超过限制（最大50MB）' });
                }
                return res.status(400).json({ message: '文件上传错误: ' + err.message });
            }
            return res.status(400).json({ message: err.message || '文件上传失败' });
        }
        next();
    });
}, speechController.generateSpeechWithReference);

// 获取历史记录
router.get('/history', authenticateToken, speechController.getHistory);

// 代理 OSS 音频（预设参考音频、预览等，避免浏览器 CORS）
router.get('/audio/proxy', authenticateToken, speechController.proxyAudio);

// 代理下载历史音频（校验归属权）
router.get('/history/audio/download', authenticateToken, speechController.downloadHistoryAudio);

module.exports = router;