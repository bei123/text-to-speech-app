const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    checkQRStatus,
    getUserCredentials,
    getQRIdentifier,
    sendAuthCode,
    phoneAuthorize,
    checkCredentialExpired,
    refreshCredential
} = require('../controllers/qqMusicController');

// 获取二维码标识符和二维码数据
router.get('/qrcode/identifier', authenticateToken, getQRIdentifier);

// 检查二维码状态
router.get('/qrcode/:identifier/status', authenticateToken, checkQRStatus);

// 获取用户QQ音乐凭证
router.get('/credentials', authenticateToken, getUserCredentials);

// 发送手机验证码
router.post('/send_authcode', authenticateToken, sendAuthCode);

// 手机验证码登录
router.post('/phone_authorize', authenticateToken, phoneAuthorize);

// 检查凭证是否过期
router.post('/check_expired', authenticateToken, checkCredentialExpired);

// 刷新凭证
router.post('/refresh_cookies', authenticateToken, refreshCredential);

module.exports = router; 