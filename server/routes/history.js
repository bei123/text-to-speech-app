const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const { getUserHistory } = require('../services/speechService');
const { pool } = require('../config/database');

// 获取用户历史记录
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // 获取历史记录
        const history = await getUserHistory(userId);
        
        // 格式化历史记录数据
        const formattedHistory = history.map(item => ({
            id: item.id,
            text: item.text,
            language: item.text_language,
            model: item.model_name,
            status: item.status,
            created_at: item.created_at,
            download_url: item.file_name ? `/api/download/${item.file_name}` : null
        }));
        
        res.json({
            success: true,
            history: formattedHistory
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

// 获取特定历史记录详情
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const requestId = req.params.id;
        
        // 查询特定历史记录
        const [rows] = await pool.query(`
            SELECT 
                ar.id,
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
                ar.id = ? AND ar.user_id = ?
        `, [requestId, userId]);
        
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '记录不存在或无权访问'
            });
        }
        
        const record = rows[0];
        
        res.json({
            success: true,
            record: {
                id: record.id,
                text: record.text,
                language: record.text_language,
                model: record.model_name,
                status: record.status,
                created_at: record.created_at,
                download_url: record.file_name ? `/api/download/${record.file_name}` : null
            }
        });
    } catch (error) {
        console.error('获取历史记录详情失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

// 删除历史记录
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const requestId = req.params.id;
        
        // 验证记录所有权
        const [rows] = await pool.query(
            'SELECT id FROM audio_requests WHERE id = ? AND user_id = ?',
            [requestId, userId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '记录不存在或无权访问'
            });
        }
        
        // 删除记录（关联的文件记录会通过外键级联删除）
        await pool.query(
            'DELETE FROM audio_requests WHERE id = ?',
            [requestId]
        );
        
        res.json({
            success: true,
            message: '历史记录已删除'
        });
    } catch (error) {
        console.error('删除历史记录失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

module.exports = router;