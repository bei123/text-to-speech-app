const fs = require('fs');
const path = require('path');
const axios = require('axios');
const pool = require('../config/db');
const speechQueue = require('../config/queue');
const { AUDIO_DIR } = require('../utils/constants');

// 初始化队列处理器
const initQueueProcessor = () => {
    speechQueue.process(async (job) => {
        const { text, text_language, model_name, userId, userEmail, username, requestId } = job.data;

        try {
            // 更新任务状态为 processing
            await pool.query('UPDATE audio_requests SET status = ? WHERE id = ?', ['processing', requestId]);

            // 调用外部 API 生成语音
            const response = await axios.post('http://192.168.0.53:9646/', {
                text,
                text_language,
                model_name
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer'
            });

            // 生成文件名和保存路径
            const fileName = `${username}_${model_name}_${Date.now()}.wav`;
            const filePath = path.join(AUDIO_DIR, fileName);

            // 保存音频文件
            fs.writeFileSync(filePath, response.data);

            // 更新任务状态为 completed
            await pool.query('UPDATE audio_requests SET status = ? WHERE id = ?', ['completed', requestId]);

            // 记录音频文件信息
            const insertFileQuery = `
                INSERT INTO audio_files (request_id, file_name, file_path)
                VALUES (?, ?, ?)
            `;
            await pool.query(insertFileQuery, [requestId, fileName, filePath]);

            // 返回下载链接
            return `https://aidudio.2000gallery.art:5000/download/${fileName}`;
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