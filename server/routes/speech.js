const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middlewares/auth');
const { pool } = require('../config/database');
const speechQueue = require('../config/queue');
const { decryptData } = require('../utils/crypto');
const redisClient = require('../config/redis');

// 获取可用模型列表
router.get('/models', optionalAuth, async (req, res) => {
    try {
        // 模拟从数据库或API获取模型列表
        const models = [
            { id: 'neural-zh-CN', name: '中文神经网络语音', language: 'zh-CN' },
            { id: 'standard-zh-CN', name: '中文标准语音', language: 'zh-CN' },
            { id: 'neural-en-US', name: '英语神经网络语音', language: 'en-US' },
            { id: 'standard-en-US', name: '英语标准语音', language: 'en-US' },
            { id: 'neural-ja-JP', name: '日语神经网络语音', language: 'ja-JP' }
        ];
        
        // 如果用户已登录，可以获取其首选模型
        if (req.user) {
            const [settings] = await pool.query(
                'SELECT preferred_model FROM user_settings WHERE user_id = ?',
                [req.user.userId]
            );
            
            if (settings.length > 0) {
                const preferredModel = settings[0].preferred_model;
                res.json({
                    success: true,
                    models,
                    preferredModel
                });
                return;
            }
        }
        
        res.json({
            success: true,
            models
        });
    } catch (error) {
        console.error('获取模型列表失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

// 生成语音
router.post('/generate', authenticateToken, async (req, res) => {
    try {
        const { encryptedData, key } = req.body;
        const userId = req.user.userId;
        const username = req.user.username;
        const userEmail = req.user.email;
        
        // 获取用户的加密密钥
        const storedKey = await redisClient.get(`encryption_key:${userId}`);
        
        if (!storedKey || storedKey !== key) {
            return res.status(401).json({
                success: false,
                message: '无效的加密密钥'
            });
        }
        
        // 解密请求数据
        let data;
        try {
            data = decryptData(encryptedData, key);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: '解密请求数据失败'
            });
        }
        
        const { text, text_language = 'zh-CN', model_name } = data;
        
        // 验证输入
        if (!text || !model_name) {
            return res.status(400).json({
                success: false,
                message: '文本和模型名称是必需的'
            });
        }
        
        // 检查文本长度
        if (text.length > 3000) {
            return res.status(400).json({
                success: false,
                message: '文本长度不能超过3000个字符'
            });
        }
        
        // 将请求记录到数据库
        const [result] = await pool.query(
            'INSERT INTO audio_requests (user_id, text, text_language, model_name, status) VALUES (?, ?, ?, ?, ?)',
            [userId, text, text_language, model_name, 'pending']
        );
        
        const requestId = result.insertId;
        
        // 添加到任务队列
        const job = await speechQueue.add({
            text,
            text_language,
            model_name,
            userId,
            userEmail,
            username,
            requestId
        });
        
        // 等待任务完成并获取结果
        const downloadUrl = await job.finished();
        
        res.json({
            success: true,
            message: '语音生成成功',
            requestId,
            downloadUrl
        });
    } catch (error) {
        console.error('生成语音失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

// 获取用户历史记录
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        
        // 查询总记录数
        const [countResult] = await pool.query(
            'SELECT COUNT(*) as total FROM audio_requests WHERE user_id = ?',
            [userId]
        );
        
        const total = countResult[0].total;
        
        // 查询历史记录
        const [rows] = await pool.query(`
            SELECT 
                ar.id,
                ar.text,
                ar.text_language,
                ar.model_name,
                ar.status,
                ar.created_at,
                af.file_name
            FROM 
                audio_requests ar
            LEFT JOIN 
                audio_files af ON ar.id = af.request_id
            WHERE 
                ar.user_id = ?
            ORDER BY 
                ar.created_at DESC
            LIMIT ?, ?
        `, [userId, offset, limit]);
        
        // 格式化结果
        const history = rows.map(row => ({
            id: row.id,
            text: row.text,
            language: row.text_language,
            model: row.model_name,
            status: row.status,
            created_at: row.created_at,
            file_name: row.file_name,
            download_url: row.file_name ? `/api/download/${row.file_name}` : null
        }));
        
        res.json({
            success: true,
            history,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('获取历史记录失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

module.exports = router; 