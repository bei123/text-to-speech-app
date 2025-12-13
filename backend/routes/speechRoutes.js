const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const speechController = require('../controllers/speechController');
const { authenticateToken } = require('../middleware/auth');
const { uploadToOSS, deleteFromOSS } = require('../utils/ossUtils');

// 配置 multer 用于文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../audio_files/temp');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
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
router.post('/v2proplus', authenticateToken, upload.single('ref_wav_file'), speechController.generateSpeechWithReference);

// 获取历史记录
router.get('/history', authenticateToken, speechController.getHistory);

module.exports = router;