const pool = require('../config/db');
const fs = require('fs');
const path = require('path');
const { uploadToOSS } = require('../utils/ossUtils');

// 初始化预设表（如果不存在）
const initPresetTable = async () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS voice_presets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            ref_audio_url VARCHAR(500) NOT NULL,
            prompt_text TEXT NOT NULL,
            prompt_language VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    
    try {
        await pool.query(createTableQuery);
        console.log('预设表初始化成功');
    } catch (error) {
        console.error('预设表初始化失败:', error);
    }
};

// 保存预设
const savePreset = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, prompt_text, prompt_language } = req.body;
        const ref_wav_file = req.file;

        // 验证必要参数
        if (!name || !prompt_text || !prompt_language || !ref_wav_file) {
            return res.status(400).json({
                message: '缺少必要参数：name, prompt_text, prompt_language 和 ref_wav_file 都是必需的'
            });
        }

        // 验证文件是否存在
        if (!fs.existsSync(ref_wav_file.path)) {
            return res.status(400).json({ message: '上传的文件不存在' });
        }

        // 获取用户信息
        const getUserQuery = 'SELECT username FROM users WHERE id = ?';
        const [userResults] = await pool.query(getUserQuery, [userId]);
        const username = userResults[0].username;

        // 读取文件并上传到 OSS
        const fileBuffer = fs.readFileSync(ref_wav_file.path);
        const fileName = `preset_${userId}_${Date.now()}_${ref_wav_file.originalname}`;
        const ossResult = await uploadToOSS(fileBuffer, fileName, username, 'v2ProPlus');

        // 删除临时文件
        fs.unlinkSync(ref_wav_file.path);

        // 保存到数据库
        const insertQuery = `
            INSERT INTO voice_presets (user_id, name, ref_audio_url, prompt_text, prompt_language)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await pool.query(insertQuery, [
            userId,
            name,
            ossResult.url,
            prompt_text,
            prompt_language
        ]);

        res.json({
            id: result.insertId,
            name,
            ref_audio_url: ossResult.url,
            prompt_text,
            prompt_language,
            message: '预设保存成功'
        });
    } catch (error) {
        console.error('保存预设失败:', error);
        res.status(500).json({ message: '保存预设失败: ' + (error.message || '未知错误') });
    }
};

// 获取用户的预设列表
const getPresets = async (req, res) => {
    try {
        const userId = req.user.id;

        const query = `
            SELECT id, name, ref_audio_url, prompt_text, prompt_language, created_at, updated_at
            FROM voice_presets
            WHERE user_id = ?
            ORDER BY updated_at DESC
        `;
        const [results] = await pool.query(query, [userId]);

        res.json({ presets: results });
    } catch (error) {
        console.error('获取预设列表失败:', error);
        res.status(500).json({ message: '获取预设列表失败' });
    }
};

// 删除预设
const deletePreset = async (req, res) => {
    try {
        const userId = req.user.id;
        const presetId = req.params.id;

        // 验证预设是否属于当前用户
        const checkQuery = 'SELECT ref_audio_url FROM voice_presets WHERE id = ? AND user_id = ?';
        const [checkResults] = await pool.query(checkQuery, [presetId, userId]);

        if (checkResults.length === 0) {
            return res.status(404).json({ message: '预设不存在或无权访问' });
        }

        // 删除预设记录
        const deleteQuery = 'DELETE FROM voice_presets WHERE id = ? AND user_id = ?';
        await pool.query(deleteQuery, [presetId, userId]);

        // 注意：OSS 文件不删除，因为可能被其他记录引用
        // 如果需要删除 OSS 文件，可以在这里添加删除逻辑

        res.json({ message: '预设删除成功' });
    } catch (error) {
        console.error('删除预设失败:', error);
        res.status(500).json({ message: '删除预设失败' });
    }
};

// 初始化表（在模块加载时执行）
initPresetTable();

module.exports = {
    savePreset,
    getPresets,
    deletePreset
};

