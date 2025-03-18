// src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import { pool } from '../utils/database.js';
import config from '../config/index.js';
import { createHmac } from 'crypto';

// 错误代码映射表
const ERROR_CODES = {
  TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  INVALID_TOKEN: 'AUTH_INVALID_CREDENTIALS',
  USER_INACTIVE: 'AUTH_USER_INACTIVE'
};

export default {
  /**
   * JWT访问令牌验证中间件
   * @param {boolean} requireActive 是否要求激活状态
   */
  verifyAccessToken: (requireActive = true) => async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        code: ERROR_CODES.INVALID_TOKEN,
        message: '无效的授权凭证'
      });
    }

    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwt.secret);

      // 验证用户状态
      const [users] = await pool.query(
        `SELECT id, is_active, encryption_key 
        FROM users 
        WHERE id = ? ${requireActive ? 'AND is_active = TRUE' : ''}`,
        [decoded.userId]
      );

      if (users.length === 0) {
        return res.status(401).json({
          code: ERROR_CODES.INVALID_TOKEN,
          message: '用户不存在'
        });
      }

      // 注入用户上下文
      req.user = {
        id: users[0].id,
        encryptionKey: users[0].encryption_key
      };

      next();
    } catch (err) {
      const errorCode = err.name === 'TokenExpiredError' 
        ? ERROR_CODES.TOKEN_EXPIRED 
        : ERROR_CODES.INVALID_TOKEN;

      res.status(401).json({
        code: errorCode,
        message: err.name === 'TokenExpiredError' 
          ? '访问令牌已过期' 
          : '无效的访问令牌'
      });
    }
  },

  /**
   * 刷新令牌中间件
   */
  refreshTokenMiddleware: async (req, res, next) => {
    const refreshToken = req.cookies?.refresh_token;
    
    if (!refreshToken) {
      return res.status(401).json({
        code: ERROR_CODES.INVALID_TOKEN,
        message: '缺少刷新令牌'
      });
    }

    try {
      // 验证刷新令牌签名
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
      
      // 验证数据库中的令牌指纹
      const [tokens] = await pool.query(
        `SELECT token_hash 
        FROM refresh_tokens 
        WHERE user_id = ? AND expires_at > NOW()`,
        [decoded.userId]
      );

      const currentHash = createHmac('sha256', config.jwt.refreshSecret)
        .update(refreshToken)
        .digest('hex');

      const isValid = tokens.some(t => t.token_hash === currentHash);
      
      if (!isValid) {
        return res.status(401).json({
          code: ERROR_CODES.INVALID_TOKEN,
          message: '无效的刷新令牌'
        });
      }

      // 生成新访问令牌
      const newAccessToken = jwt.sign(
        { userId: decoded.userId },
        config.jwt.secret,
        { expiresIn: config.jwt.accessExpiration }
      );

      // 注入新令牌到响应对象
      res.locals.newAccessToken = newAccessToken;
      req.user = { id: decoded.userId };
      next();
    } catch (err) {
      res.status(401).json({
        code: ERROR_CODES.INVALID_TOKEN,
        message: '刷新令牌验证失败'
      });
    }
  },

  /**
   * 管理员权限检查中间件
   */
  adminCheck: async (req, res, next) => {
    try {
      const [users] = await pool.query(
        `SELECT role 
        FROM user_profiles 
        WHERE user_id = ?`,
        [req.user.id]
      );

      if (users.length === 0 || users[0].role !== 'admin') {
        return res.status(403).json({
          code: 'AUTH_PERMISSION_DENIED',
          message: '需要管理员权限'
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        code: 'SERVER_ERROR',
        message: '权限验证失败'
      });
    }
  },

  /**
   * 错误处理中间件
   */
  errorHandler: (err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
      return res.status(401).json({
        code: ERROR_CODES.INVALID_TOKEN,
        message: '认证失败'
      });
    }
    next(err);
  },

  /**
   * 设置安全cookie的通用方法
   */
  setAuthCookies: (res, tokens) => {
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: config.jwt.cookieExpiration
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh'
    });
  }
};