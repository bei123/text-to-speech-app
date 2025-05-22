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
        const { qr_data, qr_type, mimetype } = req.body;

        // 将 base64 数据转换为二进制
        const binaryData = Buffer.from(qr_data, 'base64');

        // 构建请求体
        const requestBody = {
            data: binaryData,
            qr_type: qr_type || 'QQ',
            mimetype: mimetype || 'image/png',
            identifier: identifier
        };

        console.log('发送到Python后端的数据:', {
            identifier,
            qr_type: requestBody.qr_type,
            mimetype: requestBody.mimetype,
            data_length: binaryData.length
        });

        const response = await axios.get(`${PYTHON_API_BASE_URL}/login/check_qrcode`, requestBody, {
            headers: {
                'Content-Type': 'application/json'
            },
            transformRequest: [(data) => {
                // 自定义转换函数，确保二进制数据被正确处理
                if (data.data instanceof Buffer) {
                    return JSON.stringify({
                        ...data,
                        data: data.data.toString('base64')
                    });
                }
                return JSON.stringify(data);
            }]
        });

        // 直接使用Python端返回的事件状态
        const event = response.data.data.event;  // Python端返回的是事件名称
        const credential = response.data.data.credential;

        const responseData = {
            code: 200,
            message: '请求成功',
            data: {
                event: event,  // 使用event而不是status
                credential: credential || null,
                identifier: identifier
            }
        };

        return res.json(responseData);
    } catch (error) {
        console.error('检查二维码状态失败:', error);

        // 处理超时情况
        if (error.code === 'ECONNABORTED') {
            return res.json({
                code: 200,
                message: '请求成功',
                data: {
                    event: 'SCAN',  // 使用event而不是status
                    credential: null,
                    identifier: req.params.identifier
                }
            });
        }

        // 处理其他错误
        return res.status(500).json({
            error: error.response?.data?.message || '检查二维码状态失败'
        });
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