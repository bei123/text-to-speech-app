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

// 超时配置（单位：毫秒）
const TIMEOUT_CONFIG = {
    // 短文本超时时间（500字以下统一使用5分钟）
    SHORT_TEXT_TIMEOUT: parseInt(process.env.SPEECH_SHORT_TEXT_TIMEOUT) || 300000, // 默认5分钟
    // 中长文本阈值（超过此长度不设置axios超时）
    LONG_TEXT_THRESHOLD: parseInt(process.env.SPEECH_LONG_TEXT_THRESHOLD) || 500, // 默认500字
    // 中长文本的最大等待时间（1小时后标记为失败）
    LONG_TEXT_MAX_WAIT: parseInt(process.env.SPEECH_LONG_TEXT_MAX_WAIT) || 3600000 // 默认1小时
};

/**
 * 根据文本长度计算超时时间
 * @param {string} text - 要生成的文本
 * @returns {object} { timeout: 超时时间（毫秒，null表示不设置超时）, isLongText: 是否中长文本 }
 */
const calculateTimeout = (text) => {
    if (!text) {
        return { timeout: TIMEOUT_CONFIG.SHORT_TEXT_TIMEOUT, isLongText: false };
    }
    
    const textLength = text.length;
    const isLongText = textLength >= TIMEOUT_CONFIG.LONG_TEXT_THRESHOLD;
    
    if (isLongText) {
        // 中长文本不设置axios超时，但会在1小时后通过定时器检查标记为失败
        console.log('中长文本检测:', {
            textLength,
            threshold: TIMEOUT_CONFIG.LONG_TEXT_THRESHOLD,
            maxWait: `${(TIMEOUT_CONFIG.LONG_TEXT_MAX_WAIT / 1000 / 60).toFixed(1)}分钟`,
            note: '不设置axios超时，将在1小时后检查任务状态'
        });
        return { timeout: null, isLongText: true };
    }
    
    // 短文本统一使用5分钟超时
    console.log('短文本超时设置:', {
        textLength,
        timeout: `${(TIMEOUT_CONFIG.SHORT_TEXT_TIMEOUT / 1000 / 60).toFixed(1)}分钟`
    });
    
    return { timeout: TIMEOUT_CONFIG.SHORT_TEXT_TIMEOUT, isLongText: false };
};

// 初始化队列处理器
// 所有任务（普通语音和参考音频）都在同一个队列中按顺序处理
// 设置并发数为 1，确保必须等待上一个任务完成后才能开始下一个任务
const initQueueProcessor = () => {
    speechQueue.process(1, async (job) => {
        const jobData = job.data;
        const { requestId, userId, userEmail, username } = jobData;
        
        // 判断任务类型：如果有 audioFilePath，则是参考音频任务
        const isReferenceAudioTask = !!jobData.audioFilePath;

        // 记录任务开始时间（用于中长文本的1小时超时检查）
        const taskStartTime = Date.now();
        let timeoutCheckTimer = null;
        
        try {
            // 更新任务状态为 processing
            await pool.query('UPDATE audio_requests SET status = ? WHERE id = ?', ['processing', requestId]);

            let response;
            let fileName = `speech_${requestId}.wav`;
            let timeoutConfig; // 超时配置 { timeout, isLongText }

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

                // 根据文本长度计算动态超时时间
                timeoutConfig = calculateTimeout(text);
                
                console.log('队列任务调用外部API (参考音频):', {
                    url: V2PROPLUS_API_URL,
                    text: text.substring(0, 50) + '...',
                    textLength: text.length,
                    text_language,
                    prompt_text: prompt_text ? prompt_text.substring(0, 50) + '...' : '',
                    prompt_language,
                    model_name,
                    filePath: audioFilePath,
                    requestId,
                    timeout: timeoutConfig.timeout ? `${(timeoutConfig.timeout / 1000).toFixed(1)}秒` : '不设置（中长文本）',
                    isLongText: timeoutConfig.isLongText
                });

                // 如果是中长文本，设置1小时超时检查定时器
                if (timeoutConfig.isLongText) {
                    timeoutCheckTimer = setTimeout(async () => {
                        // 检查任务是否还在处理中
                        const [statusResults] = await pool.query(
                            'SELECT status FROM audio_requests WHERE id = ?',
                            [requestId]
                        );
                        
                        if (statusResults.length > 0 && statusResults[0].status === 'processing') {
                            console.error(`任务 ${requestId} 超过1小时未完成，标记为失败`);
                            await pool.query(
                                'UPDATE audio_requests SET status = ? WHERE id = ?',
                                ['failed', requestId]
                            );
                        }
                    }, TIMEOUT_CONFIG.LONG_TEXT_MAX_WAIT);
                }

                // 准备axios配置
                const axiosConfig = {
                    headers: {
                        ...formData.getHeaders()
                    },
                    responseType: 'arraybuffer',
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                };
                
                // 只有非中长文本才设置timeout
                if (timeoutConfig.timeout !== null) {
                    axiosConfig.timeout = timeoutConfig.timeout;
                }

                // 调用外部语音生成 API
                response = await axios.post(V2PROPLUS_API_URL, formData, axiosConfig);

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

                // 根据文本长度计算动态超时时间
                timeoutConfig = calculateTimeout(text);
                
                console.log('队列任务调用外部API (普通语音):', {
                    url: API_URL,
                    text: text.substring(0, 50) + '...',
                    textLength: text.length,
                    text_language,
                    model_name,
                    requestId,
                    timeout: timeoutConfig.timeout ? `${(timeoutConfig.timeout / 1000).toFixed(1)}秒` : '不设置（中长文本）',
                    isLongText: timeoutConfig.isLongText
                });

                // 如果是中长文本，设置1小时超时检查定时器
                if (timeoutConfig.isLongText) {
                    timeoutCheckTimer = setTimeout(async () => {
                        // 检查任务是否还在处理中
                        const [statusResults] = await pool.query(
                            'SELECT status FROM audio_requests WHERE id = ?',
                            [requestId]
                        );
                        
                        if (statusResults.length > 0 && statusResults[0].status === 'processing') {
                            console.error(`任务 ${requestId} 超过1小时未完成，标记为失败`);
                            await pool.query(
                                'UPDATE audio_requests SET status = ? WHERE id = ?',
                                ['failed', requestId]
                            );
                        }
                    }, TIMEOUT_CONFIG.LONG_TEXT_MAX_WAIT);
                }

                // 准备axios配置
                const axiosConfig = {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    responseType: 'arraybuffer'
                };
                
                // 只有非中长文本才设置timeout
                if (timeoutConfig.timeout !== null) {
                    axiosConfig.timeout = timeoutConfig.timeout;
                }

                // 调用语音生成 API
                response = await axios.post(API_URL, requestData, axiosConfig);
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

            // 清除超时检查定时器（如果存在）
            if (timeoutCheckTimer) {
                clearTimeout(timeoutCheckTimer);
                timeoutCheckTimer = null;
            }

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

            const taskDuration = ((Date.now() - taskStartTime) / 1000).toFixed(1);
            console.log(`任务 ${requestId} 完成，耗时: ${taskDuration}秒`);

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

            // 清除超时检查定时器（如果存在）
            if (timeoutCheckTimer) {
                clearTimeout(timeoutCheckTimer);
                timeoutCheckTimer = null;
            }

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
