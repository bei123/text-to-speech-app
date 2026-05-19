const crypto = require('crypto');

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

/**
 * 校验前端请求签名与时间戳，需配置 CLIENT_SIGN_SECRET。
 * 未配置时跳过（便于本地开发）。
 */
function verifyClientSign(req, res, next) {
    const secret = process.env.CLIENT_SIGN_SECRET;
    if (!secret) {
        return next();
    }

    if (req.method === 'OPTIONS') {
        return next();
    }

    if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
        return res.status(403).json({ message: 'Forbidden' });
    }

    const timestamp = req.headers['x-client-timestamp'];
    const sign = req.headers['x-client-sign'];

    if (!timestamp || !sign) {
        return res.status(403).json({ message: '缺少客户端校验信息' });
    }

    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_CLOCK_SKEW_MS) {
        return res.status(403).json({ message: '请求已过期' });
    }

    const payload = `${req.method.toUpperCase()}\n${req.path}\n${timestamp}`;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    try {
        const signBuf = Buffer.from(sign, 'hex');
        const expectedBuf = Buffer.from(expected, 'hex');
        if (signBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(signBuf, expectedBuf)) {
            return res.status(403).json({ message: '签名校验失败' });
        }
    } catch {
        return res.status(403).json({ message: '签名校验失败' });
    }

    next();
}

module.exports = { verifyClientSign };
