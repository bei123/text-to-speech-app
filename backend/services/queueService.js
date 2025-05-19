const axios = require('axios');
const pool = require('../config/db');
const speechQueue = require('../config/queue');
const { uploadToOSS } = require('../utils/ossUtils');

// 语音生成 API 地址
const API_URL = 'http://autodl.2000gallery.art:49788';

// 初始化队列处理器
const initQueueProcessor = () => {
    speechQueue.process(async (job) => {
        const { text, text_language, model_name, userId, userEmail, username, requestId } = job.data;

        try {
            // 更新任务状态为 processing
            await pool.query('UPDATE audio_requests SET status = ? WHERE id = ?', ['processing', requestId]);

            // 准备请求数据
            const requestData = {
                text,
                text_language,
                model_name
            };

            // 调用语音生成 API
            const response = await axios.post(API_URL, requestData, {
                headers: {
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer'
            });

            // 生成文件名
            const fileName = `speech_${requestId}.wav`;

            // 上传到阿里云 OSS
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

            // 返回 OSS 下载链接
            return ossResult.url;
        } catch (error) {
            console.error('生成语音失败:', error);
            await pool.query('UPDATE audio_requests SET status = ? WHERE id = ?', ['failed', requestId]);
            throw new Error('生成语音失败');
        }
    });
};

module.exports = {
    initQueueProcessor
}; 
