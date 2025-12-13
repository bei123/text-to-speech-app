const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const CryptoJS = require('crypto-js');
const { parseFile } = require('music-metadata');
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
        
        console.log('收到参考音频请求:', {
            userId,
            body: req.body,
            file: req.file ? {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                path: req.file.path
            } : null
        });
        
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
            return res.status(400).json({ 
                message: '缺少必要参数：text, text_language 和 ref_wav_file 是必需的',
                received: {
                    text: !!text,
                    text_language: !!text_language,
                    ref_wav_file: !!ref_wav_file
                }
            });
        }
        
        // 验证文件是否存在
        if (!fs.existsSync(ref_wav_file.path)) {
            return res.status(400).json({ message: '上传的文件不存在' });
        }
        
        // 验证音频文件时长（3-10秒）
        try {
            const metadata = await parseFile(ref_wav_file.path);
            const duration = metadata.format.duration; // 时长（秒）
            
            console.log('音频文件时长:', duration, '秒');
            
            if (!duration) {
                return res.status(400).json({ message: '无法读取音频文件时长，请确保文件格式正确' });
            }
            
            if (duration < 3) {
                return res.status(400).json({ 
                    message: `音频时长过短（${duration.toFixed(2)}秒），要求时长在3-10秒之间` 
                });
            }
            
            if (duration > 10) {
                return res.status(400).json({ 
                    message: `音频时长过长（${duration.toFixed(2)}秒），要求时长在3-10秒之间` 
                });
            }
        } catch (metadataError) {
            console.error('读取音频元数据失败:', metadataError);
            return res.status(400).json({ 
                message: '无法读取音频文件信息，请确保文件格式正确（支持 WAV、MP3）' 
            });
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
            
            console.log('调用外部API:', {
                url: V2PROPLUS_API_URL,
                text: text.substring(0, 50) + '...',
                text_language,
                prompt_text: prompt_text ? prompt_text.substring(0, 50) + '...' : '',
                prompt_language,
                model_name,
                filePath: ref_wav_file.path,
                fileSize: ref_wav_file.size
            });
            
            // 注意：FastAPI 端点不需要 Authorization header
            const response = await axios.post(V2PROPLUS_API_URL, formData, {
                headers: {
                    ...formData.getHeaders()
                },
                responseType: 'arraybuffer',
                timeout: 300000, // 5分钟超时
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
            
            // 检查响应状态码
            if (response.status !== 200) {
                throw new Error(`外部API返回非200状态码: ${response.status}`);
            }
            
            // 检查响应内容类型，如果是 JSON（错误响应），则解析错误
            const contentType = response.headers['content-type'] || '';
            if (contentType.includes('application/json')) {
                try {
                    const errorData = JSON.parse(Buffer.from(response.data).toString());
                    throw new Error(errorData.message || errorData.detail || '外部API返回错误');
                } catch (parseError) {
                    if (parseError.message && parseError.message !== '外部API返回错误') {
                        throw parseError;
                    }
                    // 如果解析失败，继续处理（可能是其他格式）
                    console.warn('无法解析错误响应:', parseError);
                }
            }
            
            // 验证响应数据大小
            if (!response.data || response.data.length === 0) {
                throw new Error('外部API返回空数据');
            }
            
            console.log('外部API响应成功，数据大小:', response.data.length, 'Content-Type:', contentType);

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
            console.error('错误详情:', {
                message: error.message,
                stack: error.stack,
                response: error.response?.data,
                status: error.response?.status,
                requestId: requestId
            });
            
            await pool.query('UPDATE audio_requests SET status = ? WHERE id = ?', ['failed', requestId]);
            
            // 删除临时文件
            if (ref_wav_file && ref_wav_file.path && fs.existsSync(ref_wav_file.path)) {
                try {
                    fs.unlinkSync(ref_wav_file.path);
                } catch (unlinkError) {
                    console.error('删除临时文件失败:', unlinkError);
                }
            }
            
            // 返回更详细的错误信息
            let errorMessage = '生成语音失败';
            if (error.response) {
                // 外部API返回的错误
                const status = error.response.status;
                let responseData = error.response.data;
                
                // 尝试解析响应数据（可能是 Buffer 或字符串）
                if (Buffer.isBuffer(responseData)) {
                    try {
                        const jsonData = JSON.parse(responseData.toString('utf-8'));
                        responseData = jsonData;
                    } catch (e) {
                        // 如果不是 JSON，转换为字符串
                        responseData = responseData.toString('utf-8').substring(0, 200);
                    }
                } else if (typeof responseData === 'string') {
                    try {
                        responseData = JSON.parse(responseData);
                    } catch (e) {
                        // 保持为字符串
                    }
                }
                
                // FastAPI 错误格式：{"code": 500, "message": "..."} 或 {"detail": "..."}
                if (responseData && typeof responseData === 'object') {
                    if (responseData.message) {
                        errorMessage = `外部API错误: ${responseData.message}`;
                    } else if (responseData.detail) {
                        errorMessage = `外部API错误: ${responseData.detail}`;
                    } else {
                        errorMessage = `外部API错误 (${status}): ${JSON.stringify(responseData)}`;
                    }
                } else {
                    errorMessage = `外部API错误 (${status}): ${String(responseData)}`;
                }
            } else if (error.request) {
                // 请求发送失败（网络问题或外部API不可达）
                errorMessage = `无法连接到外部API: ${V2PROPLUS_API_URL}。请确保服务正在运行。`;
            } else {
                // 其他错误
                errorMessage = error.message || '未知错误';
            }
            
            console.error('最终错误信息:', errorMessage);
            res.status(500).json({ message: errorMessage });
        }
    } catch (error) {
        console.error('处理请求失败:', error);
        console.error('错误详情:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ message: '处理请求失败: ' + (error.message || '未知错误') });
    }
};

module.exports = {
    generateSpeech,
    getHistory,
    generateSpeechWithReference
}; 