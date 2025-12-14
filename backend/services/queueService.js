const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const pool = require('../config/db');
const speechQueue = require('../config/queue');
const { uploadToOSS } = require('../utils/ossUtils');
require('dotenv').config();

// 语音生成 API 地址
const API_URL = process.env.SPEECH_API_URL;
const V2PROPLUS_API_URL = process.env.V2PROPLUS_API_URL || 'http://127.0.0.1:6006/v2proplus';

// 初始化队列处理器
// 所有任务（普通语音和参考音频）都在同一个队列中按顺序处理
const initQueueProcessor = () => {
    speechQueue.process(async (job) => {
        const jobData = job.data;
        const { requestId, userId, userEmail, username } = jobData;
        
        // 判断任务类型：如果有 audioFilePath，则是参考音频任务
        const isReferenceAudioTask = !!jobData.audioFilePath;

        try {
            // 更新任务状态为 processing
            await pool.query('UPDATE audio_requests SET status = ? WHERE id = ?', ['processing', requestId]);

            let response;
            let fileName = `speech_${requestId}.wav`;

            if (isReferenceAudioTask) {
                // 处理参考音频语音生成任务
                const { 
                    text, 
                    text_language, 
                    prompt_text, 
                    prompt_language, 
                    model_name,
                    audioFilePath,
                    audioFileName,
                    audioMimeType,
                    shouldDeleteTempFile
                } = jobData;

                // 验证文件是否存在
                if (!fs.existsSync(audioFilePath)) {
                    throw new Error('音频文件不存在');
                }

                // 准备 FormData 用于调用外部 API
                const formData = new FormData();
                formData.append('text', text);
                formData.append('text_language', text_language);
                formData.append('ref_wav_file', fs.createReadStream(audioFilePath), {
                    filename: audioFileName,
                    contentType: audioMimeType
                });
                formData.append('prompt_text', prompt_text);
                formData.append('prompt_language', prompt_language);
                formData.append('model_name', model_name);

                console.log('队列任务调用外部API (参考音频):', {
                    url: V2PROPLUS_API_URL,
                    text: text.substring(0, 50) + '...',
                    text_language,
                    prompt_text: prompt_text ? prompt_text.substring(0, 50) + '...' : '',
                    prompt_language,
                    model_name,
                    filePath: audioFilePath,
                    requestId
                });

                // 调用外部语音生成 API
                response = await axios.post(V2PROPLUS_API_URL, formData, {
                    headers: {
                        ...formData.getHeaders()
                    },
                    responseType: 'arraybuffer',
                    timeout: 300000, // 5分钟超时
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                });

                // 清理临时文件
                if (shouldDeleteTempFile && fs.existsSync(audioFilePath)) {
                    try {
                        fs.unlinkSync(audioFilePath);
                        console.log('已删除临时文件:', audioFilePath);
                    } catch (unlinkError) {
                        console.error('删除临时文件失败:', unlinkError);
                    }
                }
            } else {
                // 处理普通语音生成任务
                const { text, text_language, model_name } = jobData;

                // 准备请求数据
                const requestData = {
                    text,
                    text_language,
                    model_name
                };

                console.log('队列任务调用外部API (普通语音):', {
                    url: API_URL,
                    text: text.substring(0, 50) + '...',
                    text_language,
                    model_name,
                    requestId
                });

                // 调用语音生成 API
                response = await axios.post(API_URL, requestData, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    responseType: 'arraybuffer'
                });
            }

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
                    console.warn('无法解析错误响应:', parseError);
                }
            }

            // 验证响应数据大小
            if (!response.data || response.data.length === 0) {
                throw new Error('外部API返回空数据');
            }

            console.log('外部API响应成功，数据大小:', response.data.length, 'Content-Type:', contentType);

            // 上传到阿里云 OSS
            const ossResult = await uploadToOSS(response.data, fileName, username, jobData.model_name || 'v2ProPlus');

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
            console.error('错误详情:', {
                message: error.message,
                stack: error.stack,
                response: error.response?.data,
                status: error.response?.status,
                requestId,
                taskType: isReferenceAudioTask ? '参考音频' : '普通语音'
            });

            await pool.query('UPDATE audio_requests SET status = ? WHERE id = ?', ['failed', requestId]);

            // 清理临时文件（如果是参考音频任务）
            if (isReferenceAudioTask && jobData.shouldDeleteTempFile && jobData.audioFilePath && fs.existsSync(jobData.audioFilePath)) {
                try {
                    fs.unlinkSync(jobData.audioFilePath);
                } catch (unlinkError) {
                    console.error('删除临时文件失败:', unlinkError);
                }
            }

            // 返回更详细的错误信息
            let errorMessage = '生成语音失败';
            if (error.response) {
                const status = error.response.status;
                let responseData = error.response.data;
                
                if (Buffer.isBuffer(responseData)) {
                    try {
                        const jsonData = JSON.parse(responseData.toString('utf-8'));
                        responseData = jsonData;
                    } catch (e) {
                        responseData = responseData.toString('utf-8').substring(0, 200);
                    }
                } else if (typeof responseData === 'string') {
                    try {
                        responseData = JSON.parse(responseData);
                    } catch (e) {
                        // 保持为字符串
                    }
                }
                
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
                const apiUrl = isReferenceAudioTask ? V2PROPLUS_API_URL : API_URL;
                errorMessage = `无法连接到外部API: ${apiUrl}。请确保服务正在运行。`;
            } else {
                errorMessage = error.message || '未知错误';
            }

            throw new Error(errorMessage);
        }
    });
};

module.exports = {
    initQueueProcessor
}; 
