const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authConfig } = require('../config/api');
const { pool } = require('../config/database');
const redisClient = require('../config/redis');
const { generateRandomKey } = require('../utils/crypto');

// 注册用户
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 验证输入
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: '所有字段都是必需的'
            });
        }

        // 检查用户是否已存在
        const [existingUsers] = await pool.query(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: '用户名或邮箱已被注册'
            });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, authConfig.saltRounds);

        // 创建新用户
        const [result] = await pool.query(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );

        // 为新注册用户创建默认设置
        if (result.insertId) {
            await pool.query(
                'INSERT INTO user_settings (user_id, preferred_language, preferred_model) VALUES (?, ?, ?)',
                [result.insertId, 'zh-CN', 'neural-zh-CN']
            );
        }

        res.status(201).json({
            success: true,
            message: '注册成功',
            userId: result.insertId
        });
    } catch (error) {
        console.error('注册失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

// 用户登录
router.post('/login', async (req, res) => {
    try {
        const { encryptedUsername, encryptedPassword, key } = req.body;

        // 验证输入
        if (!encryptedUsername || !encryptedPassword || !key) {
            return res.status(400).json({
                success: false,
                message: '所有字段都是必需的'
            });
        }

        // 使用临时密钥解密用户名和密码
        const CryptoJS = require('crypto-js');
        const username = CryptoJS.AES.decrypt(encryptedUsername, key).toString(CryptoJS.enc.Utf8);
        const password = CryptoJS.AES.decrypt(encryptedPassword, key).toString(CryptoJS.enc.Utf8);

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: '解密失败'
            });
        }

        // 查询用户
        const [users] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        const user = users[0];

        // 验证密码
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        // 生成访问令牌
        const accessToken = jwt.sign(
            { userId: user.id, email: user.email, username: user.username },
            authConfig.jwtSecret,
            { expiresIn: authConfig.accessTokenExpiry }
        );

        // 生成刷新令牌
        const refreshToken = jwt.sign(
            { userId: user.id, email: user.email, username: user.username },
            authConfig.jwtSecret,
            { expiresIn: authConfig.refreshTokenExpiry }
        );

        // 生成加密密钥并存储
        const encryptionKey = generateRandomKey();
        await redisClient.set(
            `encryption_key:${user.id}`,
            encryptionKey,
            'EX',
            24 * 60 * 60 // 24小时过期
        );

        // 记录登录信息
        console.log(`用户登录成功: ${user.username} (ID: ${user.id})`);

        res.json({
            success: true,
            message: '登录成功',
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            },
            accessToken,
            refreshToken,
            encryptionKey
        });
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

// 刷新令牌
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
        return res.status(400).json({
            success: false,
            message: '未提供刷新令牌'
        });
    }

    try {
        // 验证刷新令牌
        const user = jwt.verify(refreshToken, authConfig.jwtSecret);
        
        // 检查刷新令牌是否在黑名单中
        const isBlacklisted = await redisClient.get(`blacklist_refresh_token:${refreshToken}`);
        if (isBlacklisted) {
            return res.status(401).json({
                success: false,
                message: '刷新令牌已被撤销'
            });
        }
        
        // 生成新的访问令牌
        const accessToken = jwt.sign(
            { userId: user.userId, email: user.email, username: user.username },
            authConfig.jwtSecret,
            { expiresIn: authConfig.accessTokenExpiry }
        );
        
        // 生成新的刷新令牌
        const newRefreshToken = jwt.sign(
            { userId: user.userId, email: user.email, username: user.username },
            authConfig.jwtSecret,
            { expiresIn: authConfig.refreshTokenExpiry }
        );
        
        // 将旧刷新令牌加入黑名单
        await redisClient.set(
            `blacklist_refresh_token:${refreshToken}`,
            'true',
            'EX',
            7 * 24 * 60 * 60 // 7天
        );
        
        return res.json({
            success: true,
            message: '令牌刷新成功',
            accessToken,
            refreshToken: newRefreshToken
        });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: '刷新令牌已过期',
                code: 'REFRESH_TOKEN_EXPIRED'
            });
        }
        
        return res.status(403).json({
            success: false,
            message: '无效的刷新令牌'
        });
    }
});

// 用户登出
router.post('/logout', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (refreshToken) {
            // 将刷新令牌加入黑名单
            await redisClient.set(
                `blacklist_refresh_token:${refreshToken}`,
                'true',
                'EX',
                7 * 24 * 60 * 60 // 7天
            );
        }
        
        res.json({
            success: true,
            message: '登出成功'
        });
    } catch (error) {
        console.error('登出失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

// 获取加密密钥
router.get('/encryption-key', async (req, res) => {
    try {
        const username = req.query.username;
        
        if (!username) {
            return res.status(400).json({
                success: false,
                message: '用户名是必需的'
            });
        }
        
        // 生成临时加密密钥
        const tempKey = generateRandomKey();
        
        // 存储临时密钥（使用用户名作为标识，但不需要用户已登录）
        await redisClient.set(
            `temp_encryption_key:${username}`,
            tempKey,
            'EX',
            10 * 60 // 10分钟过期
        );
        
        res.json({
            success: true,
            key: tempKey
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

module.exports = router; 