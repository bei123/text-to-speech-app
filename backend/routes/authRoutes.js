const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// 用户注册
router.post('/register', authController.register);

// 提供加密密钥
router.get('/encryption-key', authController.getEncryptionKey);

// 用户登录
router.post('/login', authController.login);

// 刷新 Token
router.post('/refresh-token', authController.refreshToken);

// 受保护的路由示例
router.get('/protected', authenticateToken, authController.protectedRoute);

module.exports = router; 