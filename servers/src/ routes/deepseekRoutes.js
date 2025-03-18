// src/routes/deepseekRoutes.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import DeepseekController from '../controllers/deepseekController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import config from '../config/index.js';

const router = express.Router();

// 标准聊天接口限流（每分钟10次）
const chatLimiter = rateLimit({
  windowMs: config.security.rateLimit.deepseekWindow,
  max: config.security.rateLimit.deepseekMax,
  message: {
    code: 'DEEPSEEK_RATE_LIMITED',
    message: 'API请求频率超限'
  }
});

// 流式接口特殊限流（每分钟30次）
const streamLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 30,
  message: {
    code: 'STREAM_RATE_LIMITED',
    message: '流式请求过于频繁'
  }
});

// 标准聊天接口
router.post('/chat',
  authMiddleware.verifyAccessToken, // JWT验证
  chatLimiter,                    // 基础限流
  body('prompt').isLength({ min: 1, max: 2000 }), // 输入验证
  DeepseekController.handleChatRequest
);

// 流式聊天接口
router.post('/stream',
  authMiddleware.verifyAccessToken,
  streamLimiter,
  body('prompt').isLength({ min: 1, max: 2000 }),
  DeepseekController.handleStreamRequest
);

// 历史记录查询
router.get('/history',
  authMiddleware.verifyAccessToken,
  DeepseekController.getChatHistory
);

export default router;