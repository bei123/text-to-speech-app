// src/controllers/authController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../utils/database.js';
import { redisClient } from '../utils/redis.js';
import config from '../config/index.js';
import { decryptPassword } from '../utils/cryptoUtils.js';

export default class AuthController {
  /**
   * 用户注册
   * @route POST /api/auth/register
   * @param {string} username - 用户名
   * @param {string} email - 邮箱
   * @param {string} password - 明文密码
   */
  static async register(req, res) {
    try {
      const { username, email, password } = req.body;

      // 参数校验
      if (!username || !email || !password) {
        return res.status(400).json({
          code: 'MISSING_PARAMETERS',
          message: '缺少必要参数'
        });
      }

      // 检查用户是否存在
      const [existingUsers] = await pool.query(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        [username, email]
      );

      if (existingUsers.length > 0) {
        return res.status(409).json({ 
          code: 'USER_EXISTS', 
          message: '用户名或邮箱已被注册'
        });
      }

      // 密码哈希处理
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // 创建新用户
      const [result] = await pool.query(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        [username, email, passwordHash]
      );

      // 记录审计日志
      await pool.query(
        'INSERT INTO audit_logs (user_id, action_type, description) VALUES (?, ?, ?)',
        [result.insertId, 'REGISTER', '新用户注册']
      );

      res.status(201).json({ 
        code: 'REGISTER_SUCCESS', 
        message: '注册成功',
        data: { userId: result.insertId }
      });

    } catch (error) {
      console.error('[认证控制器] 注册错误:', error);
      res.status(500).json({ 
        code: 'SERVER_ERROR',
        message: '服务器内部错误' 
      });
    }
  }

  /**
   * 用户登录
   * @route POST /api/auth/login
   * @param {string} username - 用户名
   * @param {string} encryptedPassword - AES加密后的密码
   */
  static async login(req, res) {
    try {
      const { username, encryptedPassword } = req.body;

      // 参数校验
      if (!username || !encryptedPassword) {
        return res.status(400).json({
          code: 'MISSING_CREDENTIALS',
          message: '缺少用户名或密码'
        });
      }

      // 获取加密密钥
      const secretKey = await redisClient.get(`encryptionKey:${username}`);
      if (!secretKey) {
        return res.status(401).json({ 
          code: 'INVALID_KEY', 
          message: '无效的加密密钥' 
        });
      }

      // 密码解密
      let decryptedPassword;
      try {
        decryptedPassword = decryptPassword(encryptedPassword, secretKey);
      } catch (decryptError) {
        return res.status(401).json({ 
          code: 'DECRYPTION_FAILED', 
          message: '密码解密失败' 
        });
      }

      // 用户查询
      const [users] = await pool.query(
        'SELECT * FROM users WHERE username = ?', 
        [username]
      );

      // 用户不存在或密码错误
      if (!users.length || !await bcrypt.compare(decryptedPassword, users[0].password_hash)) {
        return res.status(401).json({ 
          code: 'INVALID_CREDENTIALS', 
          message: '用户名或密码错误' 
        });
      }

      const user = users[0];

      // 生成双令牌
      const accessToken = jwt.sign(
        { id: user.id }, 
        config.jwt.secret, 
        { expiresIn: config.jwt.accessExpiration }
      );

      const refreshToken = jwt.sign(
        { id: user.id }, 
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiration }
      );

      // 记录登录日志
      await pool.query(
        'INSERT INTO user_login_logs (user_id, user_agent, ip_address) VALUES (?, ?, ?)',
        [user.id, req.headers['user-agent'], req.ip]
      );

      // 更新最后登录时间
      await pool.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = ?',
        [user.id]
      );

      res.json({
        code: 'AUTH_SUCCESS',
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.created_at
        }
      });

    } catch (error) {
      console.error('[认证控制器] 登录错误:', error);
      res.status(500).json({ 
        code: 'SERVER_ERROR', 
        message: '登录过程发生错误' 
      });
    }
  }

  /**
   * 获取加密密钥
   * @route GET /api/auth/encryption-key
   * @param {string} username - 用户名
   */
  static async getEncryptionKey(req, res) {
    try {
      const { username } = req.query;

      if (!username) {
        return res.status(400).json({
          code: 'USERNAME_REQUIRED',
          message: '需要提供用户名参数'
        });
      }

      // 生成随机加密密钥
      const encryptionKey = crypto.randomBytes(32).toString('hex');

      // 存储到Redis（有效期5分钟）
      await redisClient.set(
        `encryptionKey:${username}`,
        encryptionKey,
        'EX', 
        config.redis.ttl.encryptionKey
      );

      res.json({ 
        code: 'KEY_GENERATED', 
        key: encryptionKey 
      });

    } catch (error) {
      console.error('[认证控制器] 密钥生成错误:', error);
      res.status(500).json({ 
        code: 'KEY_GENERATION_FAILED', 
        message: '加密密钥生成失败' 
      });
    }
  }

  /**
   * 刷新访问令牌
   * @route POST /api/auth/refresh-token
   * @param {string} refreshToken - 刷新令牌
   */
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          code: 'TOKEN_REQUIRED',
          message: '需要提供刷新令牌'
        });
      }

      // 验证刷新令牌
      jwt.verify(refreshToken, config.jwt.refreshSecret, async (err, decoded) => {
        if (err) {
          return res.status(403).json({
            code: 'INVALID_TOKEN',
            message: '无效或过期的刷新令牌'
          });
        }

        // 检查用户是否存在
        const [users] = await pool.query(
          'SELECT id FROM users WHERE id = ?', 
          [decoded.id]
        );

        if (!users.length) {
          return res.status(404).json({
            code: 'USER_NOT_FOUND',
            message: '用户不存在'
          });
        }

        // 生成新访问令牌
        const newAccessToken = jwt.sign(
          { id: decoded.id }, 
          config.jwt.secret, 
          { expiresIn: config.jwt.accessExpiration }
        );

        res.json({
          code: 'TOKEN_REFRESHED',
          accessToken: newAccessToken
        });
      });

    } catch (error) {
      console.error('[认证控制器] 令牌刷新错误:', error);
      res.status(500).json({
        code: 'REFRESH_FAILED',
        message: '令牌刷新失败'
      });
    }
  }
}