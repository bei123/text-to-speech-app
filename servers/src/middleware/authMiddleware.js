import jwt from 'jsonwebtoken';
import config from '../config/index.js';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) return res.status(403).json({
      code: 'TOKEN_INVALID_OR_EXPIRED',
      message: 'Token 无效或已过期'
    });
    req.user = user;
    next();
  });
};