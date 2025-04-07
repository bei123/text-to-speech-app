const path = require('path');
const fs = require('fs');
const CryptoJS = require('crypto-js');
const pool = require('../config/db');
const redisClient = require('../config/redis');
const speechQueue = require('../config/queue');
const { AUDIO_DIR } = require('../utils/constants');

// 生成语音
const generateSpeech = async (req, res) => {
    try {
        const userId = req.user.id;
        let text, text_language, model_name, username;

        // 检查是否有加密数据
        if (req.body.encryptedData && req.body.key) {
            try {
                // 解密数据
                const bytes = CryptoJS.AES.decrypt(req.body.encryptedData, req.body.key);
                const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

                // 从解密后的数据中提取参数
                text = decryptedData.text;
                text_language = decryptedData.text_language;
                model_name = decryptedData.model_name;
                username = decryptedData.username;
            } catch (decryptError) {
                console.error('解密请求数据失败:', decryptError);
                return res.status(400).json({ message: '解密请求数据失败' });
            }
        } else {
            // 兼容未加密的请求
            text = req.body.text;
            text_language = req.body.text_language;
            model_name = req.body.model_name;
        }

        // 验证必要参数
        if (!text || !text_language || !model_name) {
            return res.status(400).json({ message: '缺少必要参数' });
        }

        // 缓存键
        const cacheKey = `speech:${userId}:${text}:${text_language}:${model_name}`;

        // 检查缓存
        const cachedResult = await redisClient.get(cacheKey);
        if (cachedResult) {
            return res.json({ downloadLink: cachedResult });
        }

        // 获取用户信息
        const getUserQuery = 'SELECT username, email FROM users WHERE id = ?';
        const [userResults] = await pool.query(getUserQuery, [userId]);
        const userInfo = userResults[0];

        // 如果请求中没有提供用户名，使用数据库中的用户名
        if (!username) {
            username = userInfo.username;
        }

        // 插入初始状态为 pending 的任务
        const insertRequestQuery = `
            INSERT INTO audio_requests (user_id, user_email, text, model_name, text_language, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [requestResult] = await pool.query(insertRequestQuery, [
            userId,
            userInfo.email,
            text,
            model_name,
            text_language,
            'pending'
        ]);

        // 添加任务到队列
        const job = await speechQueue.add({
            text,
            text_language,
            model_name,
            userId,
            userEmail: userInfo.email,
            username,
            requestId: requestResult.insertId
        });

        // 更新任务 ID
        await pool.query('UPDATE audio_requests SET job_id = ? WHERE id = ?', [job.id, requestResult.insertId]);

        // 等待任务完成
        const downloadLink = await job.finished();

        // 缓存结果
        await redisClient.set(cacheKey, downloadLink, 'EX', 3600); // 缓存1小时

        // 返回下载链接
        res.json({ downloadLink });
    } catch (error) {
        console.error('生成语音失败:', error);
        res.status(500).json({ message: '生成语音失败' });
    }
};

// 获取用户历史语音记录
const getHistory = async (req, res) => {
    const userId = req.user.id;
    const {
        keyword,
        page = 1,
        itemsPerPage = 10,
        startDate,
        endDate,
        model,
        status
    } = req.query;

    try {
        let query = `
            SELECT 
                ar.id, 
                ar.text, 
                m.label AS model_name,
                ar.text_language, 
                ar.created_at AS createdAt, 
                ar.status,
                af.oss_url AS audioUrl
            FROM 
                audio_requests ar
            LEFT JOIN 
                audio_files af ON ar.id = af.request_id
            LEFT JOIN 
                models m ON ar.model_name = m.value
            WHERE 
                ar.user_id = ?
        `;

        const params = [userId];

        // 关键词搜索
        if (keyword && keyword.trim()) {
            query += ` AND ar.text LIKE ?`;
            params.push(`%${keyword.trim()}%`);
        }

        // 日期范围筛选
        if (startDate) {
            query += ` AND DATE(ar.created_at) = ?`;
            params.push(startDate);
        }
        if (endDate) {
            query += ` AND DATE(ar.created_at) = ?`;
            params.push(endDate);
        }

        // 模型筛选
        if (model && model.trim()) {
            query += ` AND ar.model_name = ?`;
            params.push(model.trim());
        }

        // 状态筛选
        if (status && status.trim()) {
            query += ` AND ar.status = ?`;
            params.push(status.trim());
        }

        query += ` ORDER BY ar.created_at DESC LIMIT ? OFFSET ?`;
        const offset = (parseInt(page) - 1) * parseInt(itemsPerPage);
        params.push(parseInt(itemsPerPage), offset);

        const [results] = await pool.query(query, params);

        // 获取总记录数
        let countQuery = `
            SELECT COUNT(*) AS total 
            FROM audio_requests ar
            WHERE ar.user_id = ?
        `;
        const countParams = [userId];

        // 添加相同的筛选条件到计数查询
        if (keyword && keyword.trim()) {
            countQuery += ` AND ar.text LIKE ?`;
            countParams.push(`%${keyword.trim()}%`);
        }
        if (startDate) {
            countQuery += ` AND DATE(ar.created_at) = ?`;
            countParams.push(startDate);
        }
        if (endDate) {
            countQuery += ` AND DATE(ar.created_at) = ?`;
            countParams.push(endDate);
        }
        if (model && model.trim()) {
            countQuery += ` AND ar.model_name = ?`;
            countParams.push(model.trim());
        }
        if (status && status.trim()) {
            countQuery += ` AND ar.status = ?`;
            countParams.push(status.trim());
        }

        const [totalResults] = await pool.query(countQuery, countParams);
        const total = totalResults[0].total;

        // 准备响应数据
        const responseData = {
            data: results,
            total,
            page: parseInt(page),
            itemsPerPage: parseInt(itemsPerPage)
        };

        // 生成加密密钥
        const crypto = require('crypto');
        const secretKey = crypto.randomBytes(32).toString('hex');

        // 加密响应数据
        const { encryptResponse } = require('../utils/encryption');
        const encryptedData = encryptResponse(responseData, secretKey);

        // 将密钥存储在 Redis 中，设置过期时间（例如 5 分钟）
        await redisClient.set(`responseKey:${userId}`, secretKey, 'EX', 300);

        // 返回加密后的数据
        res.json({
            encryptedData,
            key: secretKey
        });
    } catch (error) {
        console.error('获取历史记录失败:', error);
        res.status(500).json({ message: '获取历史记录失败' });
    }
};

module.exports = {
    generateSpeech,
    getHistory
}; 