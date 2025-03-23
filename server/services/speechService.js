const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { pool } = require('../config/database');
const { speechConfig, serverConfig } = require('../config/api');

// 音频文件保存路径
const AUDIO_DIR = path.join(__dirname, '../../audio_files');
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR);
}

// 处理语音生成任务
const processSpeechJob = async (job) => {
    const { text, text_language, model_name, userId, userEmail, username, requestId } = job.data;

    try {
        // 更新任务状态为 processing
        await pool.query('UPDATE audio_requests SET status = ? WHERE id = ?', ['processing', requestId]);

        // 调用外部 API 生成语音
        const response = await axios.post(speechConfig.apiUrl, {
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
        return `${serverConfig.baseUrl}/download/${fileName}`;
    } catch (error) {
        console.error('生成语音失败:', error);
        await pool.query('UPDATE audio_requests SET status = ? WHERE id = ?', ['failed', requestId]);
        throw new Error('生成语音失败');
    }
};

// 获取用户历史记录
const getUserHistory = async (userId) => {
    try {
        const query = `
            SELECT 
                ar.id,
                ar.user_id,
                ar.text,
                ar.text_language,
                ar.model_name,
                ar.status,
                ar.created_at,
                af.file_name,
                af.file_path
            FROM 
                audio_requests ar
            LEFT JOIN 
                audio_files af ON ar.id = af.request_id
            WHERE 
                ar.user_id = ?
            ORDER BY 
                ar.created_at DESC
        `;
        const [rows] = await pool.query(query, [userId]);
        return rows;
    } catch (error) {
        console.error('获取历史记录失败:', error);
        throw new Error('获取历史记录失败');
    }
};

module.exports = {
    processSpeechJob,
    getUserHistory
}; 