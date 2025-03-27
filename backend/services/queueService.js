const axios = require('axios');
const pool = require('../config/db');
const speechQueue = require('../config/queue');
const { uploadToOSS } = require('../utils/ossUtils');

// 初始化队列处理器
const initQueueProcessor = () => {
    speechQueue.process(async (job) => {
        const { text, text_language, model_name, userId, userEmail, username, requestId } = job.data;

        try {
            // 更新任务状态为 processing
            await pool.query('UPDATE audio_requests SET status = ? WHERE id = ?', ['processing', requestId]);

            // 调用外部 API 生成语音
            const response = await axios.post('http://autodl.2000gallery.art:9646', {
                text,
                text_language,
                model_name
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer'
            });

            // 生成文件名
            const fileName = `${model_name}_${Date.now()}.wav`;

            // 上传到阿里云 OSS
            const ossUrl = await uploadToOSS(response.data, fileName, username);

            // 更新任务状态为 completed
            await pool.query('UPDATE audio_requests SET status = ? WHERE id = ?', ['completed', requestId]);

            // 记录音频文件信息
            const insertFileQuery = `
                INSERT INTO audio_files (request_id, file_name, oss_url)
                VALUES (?, ?, ?)
            `;
            await pool.query(insertFileQuery, [requestId, fileName, ossUrl]);

            // 返回 OSS 下载链接
            return ossUrl;
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