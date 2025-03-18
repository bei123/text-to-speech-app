// src/routes/speechRoutes.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import SpeechController from '../controllers/speechController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import config from '../config/index.js';

const router = express.Router();

// 语音生成接口限流配置（每小时100次）
const speechRateLimiter = rateLimit({
  windowMs: config.security.rateLimit.speechWindow,
  max: config.security.rateLimit.speechMax,
  message: {
    code: 'SPEECH_RATE_LIMITED',
    message: '语音生成请求过于频繁'
  }
});

// 语音生成请求
router.post('/generate',
  authMiddleware.verifyAccessToken, // JWT验证
  speechRateLimiter,               // 接口限流
  SpeechController.generateSpeech
);

// 历史记录查询
router.get('/history',
  authMiddleware.verifyAccessToken,
  SpeechController.getHistory
);

// 音频文件下载
router.get('/download/:fileName',
  authMiddleware.verifyAccessToken,
  SpeechController.downloadFile
);

export default router;