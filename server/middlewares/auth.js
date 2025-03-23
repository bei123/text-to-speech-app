const jwt = require('jsonwebtoken');
const { authConfig } = require('../config/api');
const redisClient = require('../config/redis');

// 验证访问令牌
const authenticateToken = async (req, res, next) => {
    // 从请求头获取 token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: '未提供访问令牌'
        });
    }

    try {
        // 验证 token
        const user = jwt.verify(token, authConfig.jwtSecret);
        
        // 将用户信息存储在请求中
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: '访问令牌已过期',
                code: 'TOKEN_EXPIRED'
            });
        }
        
        return res.status(403).json({
            success: false,
            message: '无效的访问令牌'
        });
    }
};

// 刷新令牌中间件
const refreshToken = async (req, res, next) => {
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
                message: '刷新令牌已被撤销',
                code: 'TOKEN_REVOKED'
            });
        }
        
        // 生成新的访问令牌
        const accessToken = jwt.sign(
            { 
                userId: user.userId,
                email: user.email,
                username: user.username
            },
            authConfig.jwtSecret,
            { expiresIn: authConfig.accessTokenExpiry }
        );
        
        // 生成新的刷新令牌
        const newRefreshToken = jwt.sign(
            { 
                userId: user.userId,
                email: user.email,
                username: user.username
            },
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
        
        // 返回新的令牌
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
};

// 可选的身份验证
const optionalAuth = async (req, res, next) => {
    // 从请求头获取 token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        // 没有令牌也可以继续
        req.user = null;
        return next();
    }

    try {
        // 验证 token
        const user = jwt.verify(token, authConfig.jwtSecret);
        
        // 将用户信息存储在请求中
        req.user = user;
        next();
    } catch (error) {
        // 令牌无效也可以继续，但用户为空
        req.user = null;
        next();
    }
};

module.exports = {
    authenticateToken,
    refreshToken,
    optionalAuth
}; 