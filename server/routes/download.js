const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { optionalAuth } = require('../middlewares/auth');
const { pool } = require('../config/database');

// 音频文件目录
const AUDIO_DIR = path.join(__dirname, '../../audio_files');

// 下载音频文件
router.get('/:filename', optionalAuth, async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(AUDIO_DIR, filename);
        
        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: '文件不存在'
            });
        }
        
        // 如果已登录，检查用户是否有权限下载此文件
        if (req.user) {
            const userId = req.user.userId;
            
            // 查询文件是否属于该用户
            const [rows] = await pool.query(`
                SELECT ar.id
                FROM audio_requests ar
                JOIN audio_files af ON ar.id = af.request_id
                WHERE ar.user_id = ? AND af.file_name = ?
            `, [userId, filename]);
            
            if (rows.length === 0) {
                // 此用户无权访问此文件
                console.warn(`用户 ${userId} 尝试下载非其所有的文件: ${filename}`);
            }
        }
        
        // 设置文件类型和下载头
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // 发送文件
        res.sendFile(filePath);
    } catch (error) {
        console.error('文件下载失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

module.exports = router; 