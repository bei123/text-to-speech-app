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

        // 验证文本长度（最多3000字）
        const MAX_TEXT_LENGTH = 3000;
        if (text.length > MAX_TEXT_LENGTH) {
            return res.status(400).json({ 
                message: `文本长度超过限制，最多支持${MAX_TEXT_LENGTH}字，当前为${text.length}字` 
            });
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

        // 添加任务到队列（所有任务都在同一个队列中）
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
            hasEncryptedData: !!req.body.encryptedData,
            file: req.file ? {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                path: req.file.path
            } : null
        });
        
        // 从表单数据中获取参数（支持加密和未加密两种方式）
        let text, text_language, prompt_text, prompt_language, ref_audio_url, username;
        const model_name = 'v2ProPlus';
        
        // 检查是否有加密数据
        if (req.body.encryptedData && req.body.key) {
            try {
                // 解密数据
                const bytes = CryptoJS.AES.decrypt(req.body.encryptedData, req.body.key);
                const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

                // 从解密后的数据中提取参数
                text = decryptedData.text;
                text_language = decryptedData.text_language;
                prompt_text = decryptedData.prompt_text;
                prompt_language = decryptedData.prompt_language;
                ref_audio_url = decryptedData.ref_audio_url; // OSS URL（如果使用预设）
                username = decryptedData.username;
            } catch (decryptError) {
                console.error('解密请求数据失败:', decryptError);
                return res.status(400).json({ message: '解密请求数据失败' });
            }
        } else {
            // 兼容未加密的请求
            text = req.body.text || '';
            text_language = req.body.text_language || '';
            prompt_text = req.body.prompt_text || '';
            prompt_language = req.body.prompt_language || '';
            ref_audio_url = req.body.ref_audio_url; // OSS URL（如果使用预设）
        }
        
        // 获取上传的文件（如果提供了文件）
        const ref_wav_file = req.file;
        
        // 验证必要参数：必须有文件或OSS URL
        if (!text || !text_language || (!ref_wav_file && !ref_audio_url) || !prompt_text || !prompt_language) {
            return res.status(400).json({ 
                message: '缺少必要参数：text, text_language, ref_wav_file 或 ref_audio_url, prompt_text 和 prompt_language 都是必需的',
                received: {
                    text: !!text,
                    text_language: !!text_language,
                    ref_wav_file: !!ref_wav_file,
                    ref_audio_url: !!ref_audio_url,
                    prompt_text: !!prompt_text,
                    prompt_language: !!prompt_language
                }
            });
        }

        // 验证文本长度（最多3000字）
        const MAX_TEXT_LENGTH = 3000;
        if (text.length > MAX_TEXT_LENGTH) {
            return res.status(400).json({ 
                message: `文本长度超过限制，最多支持${MAX_TEXT_LENGTH}字，当前为${text.length}字` 
            });
        }
        
        let audioFilePath = null;
        let shouldDeleteTempFile = false;
        
        // 如果提供了OSS URL，从OSS下载文件到临时目录
        if (ref_audio_url && !ref_wav_file) {
            try {
                console.log('从OSS下载音频文件:', ref_audio_url);
                const axios = require('axios');
                const response = await axios.get(ref_audio_url, {
                    responseType: 'arraybuffer'
                });
                
                // 保存到临时文件
                const tempDir = path.join(__dirname, '../../audio_files/temp');
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }
                audioFilePath = path.join(tempDir, `preset_${Date.now()}_${Math.round(Math.random() * 1E9)}.wav`);
                fs.writeFileSync(audioFilePath, response.data);
                shouldDeleteTempFile = true;
                
                console.log('OSS音频文件已下载到:', audioFilePath);
            } catch (downloadError) {
                console.error('从OSS下载音频文件失败:', downloadError);
                return res.status(400).json({ message: '从OSS下载音频文件失败' });
            }
        } else if (ref_wav_file) {
            // 使用上传的文件
            audioFilePath = ref_wav_file.path;
            
            // 验证文件是否存在
            if (!fs.existsSync(audioFilePath)) {
                return res.status(400).json({ message: '上传的文件不存在' });
            }
        }
        
        // 验证音频文件时长（3-10秒）
        try {
            const metadata = await parseFile(audioFilePath);
            const duration = metadata.format.duration; // 时长（秒）
            
            console.log('音频文件时长:', duration, '秒');
            
            if (!duration) {
                if (shouldDeleteTempFile && fs.existsSync(audioFilePath)) {
                    fs.unlinkSync(audioFilePath);
                }
                return res.status(400).json({ message: '无法读取音频文件时长，请确保文件格式正确' });
            }
            
            if (duration < 3) {
                if (shouldDeleteTempFile && fs.existsSync(audioFilePath)) {
                    fs.unlinkSync(audioFilePath);
                }
                return res.status(400).json({ 
                    message: `音频时长过短（${duration.toFixed(2)}秒），要求时长在3-10秒之间` 
                });
            }
            
            if (duration > 10) {
                if (shouldDeleteTempFile && fs.existsSync(audioFilePath)) {
                    fs.unlinkSync(audioFilePath);
                }
                return res.status(400).json({ 
                    message: `音频时长过长（${duration.toFixed(2)}秒），要求时长在3-10秒之间` 
                });
            }
        } catch (metadataError) {
            console.error('读取音频元数据失败:', metadataError);
            if (shouldDeleteTempFile && fs.existsSync(audioFilePath)) {
                fs.unlinkSync(audioFilePath);
            }
            return res.status(400).json({ 
                message: '无法读取音频文件信息，请确保文件格式正确（支持 WAV、MP3）' 
            });
        }

        // 获取用户信息
        const getUserQuery = 'SELECT username, email FROM users WHERE id = ?';
        const [userResults] = await pool.query(getUserQuery, [userId]);
        const userInfo = userResults[0];
        
        // 如果请求中没有提供用户名（从加密数据中），使用数据库中的用户名
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

        const requestId = requestResult.insertId;
        
        // 使用 audioFilePath（无论是上传的文件还是从OSS下载的）
        const audioFileName = ref_wav_file ? ref_wav_file.originalname : 'preset_audio.wav';
        const audioMimeType = ref_wav_file ? ref_wav_file.mimetype : 'audio/wav';
        
        // 确定是否需要删除临时文件
        // 如果是从OSS下载的，需要删除；如果是上传的文件，multer会处理，但为了安全也标记为需要删除
        const needDeleteTempFile = shouldDeleteTempFile || (ref_wav_file && ref_wav_file.path);
        
        try {
            // 添加任务到队列（所有任务都在同一个队列中）
            const job = await speechQueue.add({
                text,
                text_language,
                prompt_text,
                prompt_language,
                model_name,
                userId,
                userEmail: userInfo.email,
                username,
                requestId,
                audioFilePath,
                audioFileName,
                audioMimeType,
                shouldDeleteTempFile: needDeleteTempFile
            });

            // 更新任务 ID
            await pool.query('UPDATE audio_requests SET job_id = ? WHERE id = ?', [job.id, requestId]);

            console.log('参考音频任务已添加到队列:', {
                jobId: job.id,
                requestId,
                filePath: audioFilePath
            });

            // 等待任务完成
            const downloadLink = await job.finished();

            // 删除上传文件的临时文件（multer保存的）
            // 注意：从OSS下载的文件会在队列处理器中删除
            if (ref_wav_file && ref_wav_file.path && fs.existsSync(ref_wav_file.path)) {
                try {
                    fs.unlinkSync(ref_wav_file.path);
                    console.log('已删除上传的临时文件:', ref_wav_file.path);
                } catch (unlinkError) {
                    console.error('删除上传的临时文件失败:', unlinkError);
                }
            }

            // 返回下载链接
            res.json({ downloadLink });
        } catch (error) {
            console.error('生成语音失败:', error);
            console.error('错误详情:', {
                message: error.message,
                stack: error.stack,
                requestId
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
            if (shouldDeleteTempFile && audioFilePath && fs.existsSync(audioFilePath)) {
                try {
                    fs.unlinkSync(audioFilePath);
                } catch (unlinkError) {
                    console.error('删除临时文件失败:', unlinkError);
                }
            }
            
            // 返回错误信息
            const errorMessage = error.message || '生成语音失败';
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