const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const { generateRandomKey, storeEncryptionKey } = require('../utils/crypto');

// 为登录用户生成加密密钥
router.get('/key', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // 生成新的加密密钥
        const key = generateRandomKey();
        
        // 存储密钥到Redis
        await storeEncryptionKey(userId, key);
        
        res.json({
            success: true,
            key
        });
    } catch (error) {
        console.error('获取加密密钥失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

// 为登录前的用户生成临时加密密钥
router.get('/temp-key', async (req, res) => {
    try {
        // 生成临时加密密钥
        const key = generateRandomKey();
        
        res.json({
            success: true,
            key,
            expiresIn: 600 // 10分钟过期
        });
    } catch (error) {
        console.error('获取临时加密密钥失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

module.exports = router; 