const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const QQMusicCredential = require('../models/QQMusicCredential');

const PYTHON_API_BASE_URL = 'http://wp.2000gallery.art:9987';

// 二维码状态枚举
const QRCodeLoginEvents = {
    DONE: [0, 405],
    SCAN: [66, 408],
    CONF: [67, 404],
    TIMEOUT: [65, null],
    REFUSE: [68, 403],
    OTHER: [null, null]
};

// 手机登录状态枚举
const PhoneLoginEvents = {
    SEND: 0,
    CAPTCHA: 20276,
    FREQUENCY: 100001,
    OTHER: null
};

// 登录类型枚举
const QRLoginType = {
    QQ: 'qq',
    WX: 'wx'
};

// 存储二维码状态和凭证的临时存储
const qrCodeStore = new Map();

// 清理过期的二维码数据
const cleanupExpiredQRCodes = () => {
    const now = Date.now();
    for (const [identifier, data] of qrCodeStore.entries()) {
        if (now - data.timestamp > 5 * 60 * 1000) { // 5分钟过期
            qrCodeStore.delete(identifier);
        }
    }
};

// 每5分钟清理一次过期数据
setInterval(cleanupExpiredQRCodes, 5 * 60 * 1000);

// 获取二维码标识符和二维码数据
async function getQRIdentifier(req, res) {
    try {
        const loginType = req.query.login_type || QRLoginType.QQ;
        const response = await axios.get(`${PYTHON_API_BASE_URL}/login/get_qrcode`, {
            params: {
                login_type: loginType
            }
        });

        if (response.data.code !== 200) {
            return res.status(500).json({ error: response.data.message || '获取二维码失败' });
        }

        return res.json(response.data);
    } catch (error) {
        console.error('获取二维码标识符失败:', error);
        return res.status(500).json({ error: '获取二维码标识符失败' });
    }
}

// 检查二维码状态
async function checkQRStatus(req, res) {
    try {
        const { identifier } = req.params;
        const response = await axios.get(`${PYTHON_API_BASE_URL}/login/check_qrcode`, {
            params: {
                identifier,
                _: Date.now()
            }
        });

        if (response.data.code !== 200) {
            return res.status(500).json({ error: response.data.message || '检查二维码状态失败' });
        }

        // 处理状态码
        const status = response.data.data.status;
        let event;
        
        // 检查状态是否匹配任何预定义状态
        for (const [key, values] of Object.entries(QRCodeLoginEvents)) {
            if (values.includes(status)) {
                event = key;
                break;
            }
        }
        
        if (!event) {
            event = 'OTHER';
        }

        return res.json({
            code: 200,
            message: '请求成功',
            data: {
                status: event,
                credential: response.data.data.credential || null
            }
        });
    } catch (error) {
        console.error('检查二维码状态失败:', error);
        if (error.code === 'ECONNABORTED') {
            return res.json({
                code: 200,
                message: '请求成功',
                data: {
                    status: 'SCAN',
                    credential: null
                }
            });
        }
        return res.status(500).json({ error: '检查二维码状态失败' });
    }
}

// 发送手机验证码
async function sendAuthCode(req, res) {
    try {
        const { phone, country_code = 86 } = req.body;
        
        const response = await axios.post(`${PYTHON_API_BASE_URL}/login/send_authcode`, {
            phone,
            country_code
        });

        if (response.data.code !== 200) {
            return res.status(500).json({ error: response.data.message || '发送验证码失败' });
        }

        let event;
        switch (response.data.code) {
            case PhoneLoginEvents.CAPTCHA:
                event = 'CAPTCHA';
                break;
            case PhoneLoginEvents.FREQUENCY:
                event = 'FREQUENCY';
                break;
            case PhoneLoginEvents.SEND:
                event = 'SEND';
                break;
            default:
                event = 'OTHER';
        }

        return res.json({
            code: 200,
            message: '请求成功',
            data: {
                status: event,
                securityURL: response.data.data?.securityURL || null
            }
        });
    } catch (error) {
        console.error('发送验证码失败:', error);
        return res.status(500).json({ error: '发送验证码失败' });
    }
}

// 手机验证码登录
async function phoneAuthorize(req, res) {
    try {
        const { phone, auth_code, country_code = 86 } = req.body;
        
        const response = await axios.post(`${PYTHON_API_BASE_URL}/login/phone_authorize`, {
            phone,
            auth_code,
            country_code
        });

        if (response.data.code === 20271) {
            return res.status(400).json({ error: '验证码错误或已鉴权' });
        }

        if (response.data.code !== 200) {
            return res.status(500).json({ error: response.data.message || '手机登录失败' });
        }

        return res.json(response.data);
    } catch (error) {
        console.error('手机登录失败:', error);
        return res.status(500).json({ error: '手机登录失败' });
    }
}

// 获取用户QQ音乐凭证
async function getUserCredentials(req, res) {
    try {
        const response = await axios.get(`${PYTHON_API_BASE_URL}/login/get_credentials`);

        if (response.data.code !== 200) {
            return res.status(500).json({ error: response.data.message || '获取凭证失败' });
        }

        return res.json(response.data);
    } catch (error) {
        console.error('获取凭证失败:', error);
        return res.status(500).json({ error: '获取凭证失败' });
    }
}

// 检查凭证是否过期
async function checkCredentialExpired(req, res) {
    try {
        const response = await axios.post(`${PYTHON_API_BASE_URL}/login/check_expired`, {
            credential: req.body.credential
        });

        return res.json(response.data);
    } catch (error) {
        console.error('检查凭证过期失败:', error);
        return res.status(500).json({ error: '检查凭证过期失败' });
    }
}

// 刷新凭证
async function refreshCredential(req, res) {
    try {
        const response = await axios.post(`${PYTHON_API_BASE_URL}/login/refresh_cookies`, {
            credential: req.body.credential
        });

        return res.json(response.data);
    } catch (error) {
        console.error('刷新凭证失败:', error);
        return res.status(500).json({ error: '刷新凭证失败' });
    }
}

module.exports = {
    checkQRStatus,
    getUserCredentials,
    getQRIdentifier,
    sendAuthCode,
    phoneAuthorize,
    checkCredentialExpired,
    refreshCredential
}; 