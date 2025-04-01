const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');
const pool = require('../config/db');
const redisClient = require('../config/redis');
const { generateEncryptionKey } = require('../utils/encryption');

// 用户注册
const register = async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // 检查用户名和邮箱是否已存在
        const checkUserQuery = 'SELECT * FROM users WHERE username = ? OR email = ?';
        const [results] = await pool.query(checkUserQuery, [username, email]);

        if (results.length > 0) {
            // 分别检查用户名和邮箱
            const [existingUser] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
            const [existingEmail] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
            
            if (existingUser.length > 0 && existingEmail.length > 0) {
                return res.status(400).json({ 
                    message: '用户名和邮箱都已被注册',
                    code: 'BOTH_EXIST'
                });
            } else if (existingUser.length > 0) {
                return res.status(400).json({ 
                    message: '该用户名已被使用',
                    code: 'USERNAME_EXISTS'
                });
            } else {
                return res.status(400).json({ 
                    message: '该邮箱已被注册',
                    code: 'EMAIL_EXISTS'
                });
            }
        }

        // 验证密码强度
        if (password.length < 6) {
            return res.status(400).json({
                message: '密码长度至少为6个字符',
                code: 'PASSWORD_TOO_SHORT'
            });
        }
        if (!/[A-Z]/.test(password)) {
            return res.status(400).json({
                message: '密码必须包含至少一个大写字母',
                code: 'PASSWORD_NO_UPPERCASE'
            });
        }
        if (!/[a-z]/.test(password)) {
            return res.status(400).json({
                message: '密码必须包含至少一个小写字母',
                code: 'PASSWORD_NO_LOWERCASE'
            });
        }
        if (!/[0-9]/.test(password)) {
            return res.status(400).json({
                message: '密码必须包含至少一个数字',
                code: 'PASSWORD_NO_NUMBER'
            });
        }
        if (!/[!@#$%^&*]/.test(password)) {
            return res.status(400).json({
                message: '密码必须包含至少一个特殊字符 (!@#$%^&*)',
                code: 'PASSWORD_NO_SPECIAL'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 插入新用户
        const insertUserQuery = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';
        await pool.query(insertUserQuery, [username, email, passwordHash]);

        res.status(201).json({ message: '用户注册成功' });
    } catch (error) {
        console.error('注册失败:', error);
        res.status(500).json({ message: '注册失败' });
    }
};

// 提供加密密钥
const getEncryptionKey = async (req, res) => {
    try {
        const encryptionKey = generateEncryptionKey(); // 每次请求生成一个新的密钥
        
        // 检查是否有加密的用户名
        if (req.query.encryptedUsername) {
            // 使用固定的初始密钥解密用户名
            const initialKey = 'text-to-speech-initial-key';
            try {
                const bytes = CryptoJS.AES.decrypt(req.query.encryptedUsername, initialKey);
                const username = bytes.toString(CryptoJS.enc.Utf8);
                
                if (username) {
                    // 将密钥存储在 Redis 中，设置过期时间（例如 5 分钟）
                    await redisClient.set(`encryptionKey:${username}`, encryptionKey, 'EX', 300);
                }
            } catch (error) {
                console.error('解密用户名失败:', error);
                // 即使解密失败也继续，返回密钥但不存储关联
            }
        } else if (req.query.username) {
            // 兼容未加密的用户名
            const username = req.query.username;
            await redisClient.set(`encryptionKey:${username}`, encryptionKey, 'EX', 300);
        }

        res.json({ key: encryptionKey });
    } catch (error) {
        console.error('生成加密密钥失败:', error);
        res.status(500).json({ message: '生成加密密钥失败' });
    }
};

// 用户登录
const login = async (req, res) => {
    const { encryptedUsername, encryptedPassword, key } = req.body;

    try {
        // 验证请求参数
        if (!encryptedUsername || !encryptedPassword || !key) {
            return res.status(400).json({ message: '缺少必要参数' });
        }
        
        // 使用提供的密钥解密用户名
        const usernameBytes = CryptoJS.AES.decrypt(encryptedUsername, key);
        const username = usernameBytes.toString(CryptoJS.enc.Utf8);
        
        if (!username) {
            return res.status(400).json({ message: '解密用户名失败' });
        }

        // 查找用户
        const findUserQuery = 'SELECT * FROM users WHERE username = ? OR email = ?';
        const [results] = await pool.query(findUserQuery, [username, username]);

        if (results.length === 0) {
            return res.status(400).json({ 
                message: '账号不存在',
                code: 'ACCOUNT_NOT_FOUND'
            });
        }

        const user = results[0];

        // 使用提供的密钥解密密码
        const passwordBytes = CryptoJS.AES.decrypt(encryptedPassword, key);
        const password = passwordBytes.toString(CryptoJS.enc.Utf8);
        
        if (!password) {
            return res.status(400).json({ 
                message: '密码格式错误',
                code: 'INVALID_PASSWORD_FORMAT'
            });
        }

        // 验证密码
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ 
                message: '密码错误',
                code: 'WRONG_PASSWORD'
            });
        }

        // 生成 Access Token
        const accessToken = jwt.sign({ id: user.id }, 'your_jwt_secret', { expiresIn: '15m' });

        // 生成 Refresh Token
        const refreshToken = jwt.sign({ id: user.id }, 'your_refresh_secret', { expiresIn: '7d' });

        // 返回的用户信息
        const userResponse = {
            id: user.id,
            username: user.username,
            email: user.email,
        };

        // 记录登录信息
        const userAgent = req.headers['user-agent'];
        const ipAddress = req.ip || req.connection.remoteAddress;

        const insertLoginLogQuery = `
            INSERT INTO user_login_logs (user_id, user_agent, ip_address)
            VALUES (?, ?, ?)
        `;
        await pool.query(insertLoginLogQuery, [user.id, userAgent, ipAddress]);

        // 返回登录成功信息
        res.json({
            accessToken,
            refreshToken,
            user: userResponse
        });
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({ message: '登录失败' });
    }
};

// 刷新 Token
const refreshToken = async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ message: '未提供 Refresh Token' });
    }

    try {
        // 验证 Refresh Token
        jwt.verify(refreshToken, 'your_refresh_secret', (err, user) => {
            if (err) {
                return res.status(403).json({ 
                    message: 'Refresh Token 无效或已过期',
                    code: 'REFRESH_TOKEN_EXPIRED'
                });
            }

            // 生成新的 Access Token
            const newAccessToken = jwt.sign({ id: user.id }, 'your_jwt_secret', { expiresIn: '15m' });
            
            // 生成新的 Refresh Token
            const newRefreshToken = jwt.sign({ id: user.id }, 'your_refresh_secret', { expiresIn: '7d' });

            // 返回新的 Token
            res.json({ 
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            });
        });
    } catch (error) {
        console.error('刷新 Token 失败:', error);
        res.status(500).json({ message: '刷新 Token 失败' });
    }
};

// 受保护的路由示例
const protectedRoute = (req, res) => {
    res.json({ message: '这是受保护的路由', user: req.user });
};

module.exports = {
    register,
    getEncryptionKey,
    login,
    refreshToken,
    protectedRoute
}; 