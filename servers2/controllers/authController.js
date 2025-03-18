const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const redisClient = require('../services/redisService');
const { decryptPassword } = require('../utils/encryptionUtils');

exports.register = async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const checkUserQuery = 'SELECT * FROM users WHERE username = ? OR email = ?';
        const [results] = await pool.query(checkUserQuery, [username, email]);

        if (results.length > 0) {
            return res.status(400).json({ message: '用户名或邮箱已存在' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const insertUserQuery = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';
        await pool.query(insertUserQuery, [username, email, passwordHash]);

        res.status(201).json({ message: '用户注册成功' });
    } catch (error) {
        console.error('注册失败:', error);
        res.status(500).json({ message: '注册失败' });
    }
};

exports.login = async (req, res) => {
    const { username, encryptedPassword } = req.body;

    try {
        const findUserQuery = 'SELECT * FROM users WHERE username = ?';
        const [results] = await pool.query(findUserQuery, [username]);

        if (results.length === 0) {
            return res.status(400).json({ message: '用户名或密码错误' });
        }

        const user = results[0];
        const secretKey = await redisClient.get(`encryptionKey:${username}`);
        if (!secretKey) {
            return res.status(400).json({ message: '加密密钥无效' });
        }

        const decryptedPassword = decryptPassword(encryptedPassword, secretKey);
        const isMatch = await bcrypt.compare(decryptedPassword, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: '用户名或密码错误' });
        }

        const accessToken = jwt.sign({ id: user.id }, 'your_jwt_secret', { expiresIn: '15m' });
        const refreshToken = jwt.sign({ id: user.id }, 'your_refresh_secret', { expiresIn: '7d' });

        const userResponse = {
            id: user.id,
            username: user.username,
            email: user.email,
        };

        const userAgent = req.headers['user-agent'];
        const ipAddress = req.ip || req.connection.remoteAddress;

        const insertLoginLogQuery = `
            INSERT INTO user_login_logs (user_id, user_agent, ip_address)
            VALUES (?, ?, ?)
        `;
        await pool.query(insertLoginLogQuery, [user.id, userAgent, ipAddress]);

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

exports.refreshToken = async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ message: '未提供 Refresh Token' });
    }

    try {
        jwt.verify(refreshToken, 'your_refresh_secret', (err, user) => {
            if (err) {
                return res.status(403).json({ message: 'Refresh Token 无效或已过期' });
            }

            const newAccessToken = jwt.sign({ id: user.id }, 'your_jwt_secret', { expiresIn: '15m' });
            res.json({ accessToken: newAccessToken });
        });
    } catch (error) {
        console.error('刷新 Token 失败:', error);
        res.status(500).json({ message: '刷新 Token 失败' });
    }
};