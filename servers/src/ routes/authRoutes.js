// src/routes/authRoutes.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import AuthController from '../controllers/authController.js';
import config from '../config/index.js';

const router = express.Router();

// 认证接口限流配置（15分钟100次）
const authRateLimiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 'RATE_LIMITED',
    message: '操作过于频繁，请稍后再试'
  }
});

// 注册路由
router.post('/register', 
  authRateLimiter, // 应用速率限制
  AuthController.register
);

// 登录路由
router.post('/login', 
  authRateLimiter,
  AuthController.login
);

// 获取加密密钥路由
router.get('/encryption-key', 
  AuthController.getEncryptionKey
);

// 令牌刷新路由
router.post('/refresh-token', 
  AuthController.refreshToken
);

export default router;