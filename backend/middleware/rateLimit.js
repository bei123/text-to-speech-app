const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: '请求过于频繁，请稍后再试' },
});

const speechLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_SPEECH_MAX || '30', 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: '语音生成请求过多，请稍后再试' },
});

module.exports = { generalLimiter, speechLimiter };
