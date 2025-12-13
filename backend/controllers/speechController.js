const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
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

// 使用参考音频生成语音 (v2ProPlus)
const generateSpeechWithReference = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // 从表单数据中获取参数
        const text = req.body.text || '';
        const text_language = req.body.text_language || '';
        const prompt_text = req.body.prompt_text || '';
        const prompt_language = req.body.prompt_language || '';
        const model_name = 'v2ProPlus';
        
        // 获取上传的文件
        const ref_wav_file = req.file;
        
        // 验证必要参数
        if (!text || !text_language || !ref_wav_file) {
            return res.status(400).json({ message: '缺少必要参数：text, text_language 和 ref_wav_file 是必需的' });
        }

        // 获取用户信息
        const getUserQuery = 'SELECT username, email FROM users WHERE id = ?';
        const [userResults] = await pool.query(getUserQuery, [userId]);
        const userInfo = userResults[0];
        const username = userInfo.username;

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

        const requestId = requestResult.insertId;
        
        try {
            // 更新任务状态为 processing
            await pool.query('UPDATE audio_requests SET status = ? WHERE id = ?', ['processing', requestId]);

            // 准备 FormData 用于调用外部 API
            const formData = new FormData();
            formData.append('text', text);
            formData.append('text_language', text_language);
            formData.append('ref_wav_file', fs.createReadStream(ref_wav_file.path), {
                filename: ref_wav_file.originalname,
                contentType: ref_wav_file.mimetype
            });
            formData.append('prompt_text', prompt_text);
            formData.append('prompt_language', prompt_language);
            formData.append('model_name', model_name);

            // 调用外部语音生成 API
            const V2PROPLUS_API_URL = process.env.V2PROPLUS_API_URL || 'http://127.0.0.1:6006/v2proplus';
            const response = await axios.post(V2PROPLUS_API_URL, formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${req.headers.authorization?.replace('Bearer ', '') || ''}`
                },
                responseType: 'arraybuffer',
                timeout: 300000 // 5分钟超时
            });

            // 生成文件名
            const fileName = `speech_${requestId}.wav`;

            // 上传到阿里云 OSS
            const { uploadToOSS } = require('../utils/ossUtils');
            const ossResult = await uploadToOSS(response.data, fileName, username, model_name);

            // 更新任务状态为 completed
            await pool.query('UPDATE audio_requests SET status = ? WHERE id = ?', ['completed', requestId]);

            // 处理音频文件
            const audioFile = {
                request_id: requestId,
                file_name: fileName,
                oss_url: ossResult.url
            };

            // 保存到数据库
            await pool.query(
                'INSERT INTO audio_files (request_id, file_name, oss_url) VALUES (?, ?, ?)',
                [audioFile.request_id, audioFile.file_name, audioFile.oss_url]
            );

            // 删除临时文件
            fs.unlinkSync(ref_wav_file.path);

            // 返回下载链接
            res.json({ downloadLink: ossResult.url });
        } catch (error) {
            console.error('生成语音失败:', error);
            await pool.query('UPDATE audio_requests SET status = ? WHERE id = ?', ['failed', requestId]);
            
            // 删除临时文件
            if (ref_wav_file && ref_wav_file.path && fs.existsSync(ref_wav_file.path)) {
                fs.unlinkSync(ref_wav_file.path);
            }
            
            res.status(500).json({ message: '生成语音失败: ' + (error.message || '未知错误') });
        }
    } catch (error) {
        console.error('处理请求失败:', error);
        res.status(500).json({ message: '处理请求失败' });
    }
};

module.exports = {
    generateSpeech,
    getHistory,
    generateSpeechWithReference
}; 