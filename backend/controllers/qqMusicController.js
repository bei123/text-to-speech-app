const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const QQMusicCredential = require('../models/QQMusicCredential');

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

// 获取二维码标识符
async function getQRIdentifier(req, res) {
    try {
        // 生成唯一标识符
        const identifier = uuidv4();
        
        // 保存二维码状态
        qrCodeStore.set(identifier, {
            status: 'SCAN',
            timestamp: Date.now(),
            userId: req.user.id // 从认证中间件获取用户ID
        });

        return res.json({ identifier });
    } catch (error) {
        console.error('获取二维码标识符失败:', error);
        return res.status(500).json({ error: '获取二维码标识符失败' });
    }
}

// 获取QQ登录二维码
async function getQQLoginQR(req, res) {
    try {
        const response = await axios.get('https://ssl.ptlogin2.qq.com/ptqrshow', {
            params: {
                appid: '716027609',
                e: '2',
                l: 'M',
                s: '3',
                d: '72',
                v: '4',
                t: Math.random(),
                daid: '383',
                pt_3rd_aid: '100497308'
            },
            headers: {
                'Referer': 'https://xui.ptlogin2.qq.com/'
            },
            responseType: 'arraybuffer'
        });

        const qrsig = response.headers['set-cookie']?.[0]?.split(';')[0].split('=')[1];
        if (!qrsig) {
            return res.status(500).json({ error: '获取二维码失败' });
        }

        // 从请求头中获取标识符
        const identifier = req.headers['x-qr-identifier'] || req.headers['x-qr-identifier'];
        if (!identifier) {
            console.error('请求头:', req.headers);
            return res.status(400).json({ error: '缺少二维码标识符' });
        }

        // 更新二维码状态
        const qrData = qrCodeStore.get(identifier);
        if (!qrData) {
            console.error('无效的二维码标识符:', identifier);
            return res.status(404).json({ error: '二维码标识符无效' });
        }

        qrData.qrsig = qrsig;
        qrCodeStore.set(identifier, qrData);

        // 设置响应头
        res.set('Content-Type', 'image/png');
        
        return res.send(response.data);
    } catch (error) {
        console.error('获取QQ登录二维码失败:', error);
        return res.status(500).json({ error: '获取二维码失败' });
    }
}

// 检查二维码状态
async function checkQRStatus(req, res) {
    const { identifier } = req.params;
    const qrData = qrCodeStore.get(identifier);

    if (!qrData) {
        return res.status(404).json({ error: '二维码不存在或已过期' });
    }

    // 验证用户权限
    if (qrData.userId !== req.user.id) {
        return res.status(403).json({ error: '无权访问此二维码' });
    }

    try {
        const response = await axios.get('https://ssl.ptlogin2.qq.com/ptqrlogin', {
            params: {
                u1: 'https://graph.qq.com/oauth2.0/login_jump',
                ptqrtoken: hash33(qrData.qrsig),
                ptredirect: '0',
                h: '1',
                t: '1',
                g: '1',
                from_ui: '1',
                ptlang: '2052',
                action: `0-0-${Date.now()}`,
                js_ver: '20102616',
                js_type: '1',
                pt_uistyle: '40',
                aid: '716027609',
                daid: '383',
                pt_3rd_aid: '100497308',
                has_onekey: '1'
            },
            headers: {
                'Referer': 'https://xui.ptlogin2.qq.com/',
                'Cookie': `qrsig=${qrData.qrsig}`
            }
        });

        const match = response.data.match(/ptuiCB\((.*?)\)/);
        if (!match) {
            return res.status(500).json({ error: '获取二维码状态失败' });
        }

        const data = match[1].split(',').map(p => p.trim().replace(/'/g, ''));
        const code = parseInt(data[0]);

        let status;
        switch (code) {
            case 0:
                status = 'DONE';
                // 登录成功，保存凭证
                await saveCredentials(qrData.userId, response);
                break;
            case 66:
                status = 'SCAN';
                break;
            case 67:
                status = 'CONF';
                break;
            case 65:
                status = 'TIMEOUT';
                break;
            case 68:
                status = 'REFUSE';
                break;
            default:
                status = 'OTHER';
        }

        // 更新状态
        qrData.status = status;
        qrCodeStore.set(identifier, qrData);

        return res.json({ status });
    } catch (error) {
        console.error('检查二维码状态失败:', error);
        return res.status(500).json({ error: '检查二维码状态失败' });
    }
}

// 保存用户凭证
async function saveCredentials(userId, response) {
    try {
        const cookies = response.headers['set-cookie'];
        const cookieObj = {};
        cookies.forEach(cookie => {
            const [key, value] = cookie.split(';')[0].split('=');
            cookieObj[key] = value;
        });

        const [qqUin, pSkey, skey] = [
            cookieObj.uin,
            cookieObj.p_skey,
            cookieObj.skey
        ];

        // 使用 upsert 来更新或创建凭证
        await QQMusicCredential.upsert({
            userId,
            qqUin,
            pSkey,
            skey,
            cookies: cookieObj,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天过期
        });
    } catch (error) {
        console.error('保存凭证失败:', error);
        throw error;
    }
}

// 获取用户QQ音乐凭证
async function getUserCredentials(req, res) {
    try {
        const credential = await QQMusicCredential.findOne({
            where: { userId: req.user.id }
        });

        if (!credential) {
            return res.status(404).json({ error: '未找到QQ音乐凭证' });
        }

        // 检查凭证是否过期
        if (credential.expiresAt < new Date()) {
            return res.status(401).json({ error: '凭证已过期' });
        }

        return res.json({
            qqUin: credential.qqUin,
            expiresAt: credential.expiresAt
        });
    } catch (error) {
        console.error('获取凭证失败:', error);
        return res.status(500).json({ error: '获取凭证失败' });
    }
}

// 简单的hash33函数实现
function hash33(str, init = 0) {
    let hash = init;
    for (let i = 0; i < str.length; i++) {
        hash += (hash << 5) + str.charCodeAt(i);
    }
    return hash & 0x7fffffff;
}

module.exports = {
    getQQLoginQR,
    checkQRStatus,
    getUserCredentials,
    getQRIdentifier
}; 