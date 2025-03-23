const jwt = require('jsonwebtoken');

// JWT 验证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: '未提供 Token' });
    }

    jwt.verify(token, 'your_jwt_secret', (err, user) => {
        if (err) {
            return res.status(401).json({
                message: 'Token 无效或已过期',
                code: 'TOKEN_INVALID_OR_EXPIRED'
            });
        }
        req.user = user;
        next();
    });
};

module.exports = { authenticateToken }; 