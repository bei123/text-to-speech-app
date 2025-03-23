const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { authenticateToken } = require('../middlewares/auth');
const { pool } = require('../config/database');
const { authConfig } = require('../config/api');

// 获取用户资料
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // 查询用户信息
        const [users] = await pool.query(
            'SELECT id, username, email, created_at FROM users WHERE id = ?',
            [userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        
        // 查询用户设置
        const [settings] = await pool.query(
            'SELECT preferred_language, preferred_model, theme FROM user_settings WHERE user_id = ?',
            [userId]
        );
        
        // 查询用户统计数据
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total_requests,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_requests,
                COUNT(DISTINCT DATE(created_at)) as active_days
            FROM audio_requests
            WHERE user_id = ?
        `, [userId]);
        
        const user = users[0];
        const userSettings = settings.length > 0 ? settings[0] : null;
        const userStats = stats[0];
        
        res.json({
            success: true,
            profile: {
                id: user.id,
                username: user.username,
                email: user.email,
                created_at: user.created_at,
                settings: userSettings,
                stats: userStats
            }
        });
    } catch (error) {
        console.error('获取用户资料失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

// 更新用户资料
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { preferred_language, preferred_model, theme } = req.body;
        
        // 更新用户设置
        const [result] = await pool.query(`
            INSERT INTO user_settings (user_id, preferred_language, preferred_model, theme)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                preferred_language = VALUES(preferred_language),
                preferred_model = VALUES(preferred_model),
                theme = VALUES(theme)
        `, [userId, preferred_language, preferred_model, theme]);
        
        res.json({
            success: true,
            message: '用户资料更新成功'
        });
    } catch (error) {
        console.error('更新用户资料失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

// 修改密码
router.put('/password', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { current_password, new_password } = req.body;
        
        // 验证输入
        if (!current_password || !new_password) {
            return res.status(400).json({
                success: false,
                message: '当前密码和新密码是必需的'
            });
        }
        
        // 验证新密码长度
        if (new_password.length < 8) {
            return res.status(400).json({
                success: false,
                message: '新密码长度必须至少为8个字符'
            });
        }
        
        // 获取用户当前密码
        const [users] = await pool.query(
            'SELECT password FROM users WHERE id = ?',
            [userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        
        const user = users[0];
        
        // 验证当前密码
        const validPassword = await bcrypt.compare(current_password, user.password);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: '当前密码不正确'
            });
        }
        
        // 加密新密码
        const hashedPassword = await bcrypt.hash(new_password, authConfig.saltRounds);
        
        // 更新密码
        await pool.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );
        
        res.json({
            success: true,
            message: '密码修改成功'
        });
    } catch (error) {
        console.error('修改密码失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
});

module.exports = router; 