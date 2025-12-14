const pool = require('../config/db');
const fs = require('fs');
const path = require('path');
const CryptoJS = require('crypto-js');
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
            is_shared TINYINT(1) DEFAULT 0,
            use_count INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_id (user_id),
            INDEX idx_is_shared (is_shared)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    
    try {
        await pool.query(createTableQuery);
        console.log('预设表初始化成功');
        
        // 检查并添加 is_shared 字段（如果表已存在但没有该字段）
        try {
            await pool.query('ALTER TABLE voice_presets ADD COLUMN is_shared TINYINT(1) DEFAULT 0');
            await pool.query('ALTER TABLE voice_presets ADD INDEX idx_is_shared (is_shared)');
            console.log('已添加 is_shared 字段');
        } catch (alterError) {
            // 字段已存在，忽略错误
            if (!alterError.message.includes('Duplicate column name')) {
                console.warn('添加 is_shared 字段时出现警告:', alterError.message);
            }
        }
        
        // 检查并添加 use_count 字段（如果表已存在但没有该字段）
        try {
            await pool.query('ALTER TABLE voice_presets ADD COLUMN use_count INT DEFAULT 0');
            console.log('已添加 use_count 字段');
        } catch (alterError) {
            // 字段已存在，忽略错误
            if (!alterError.message.includes('Duplicate column name')) {
                console.warn('添加 use_count 字段时出现警告:', alterError.message);
            }
        }
    } catch (error) {
        console.error('预设表初始化失败:', error);
    }
};

// 保存预设
const savePreset = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // 从表单数据中获取参数（支持加密和未加密两种方式）
        let name, prompt_text, prompt_language, username;
        const ref_wav_file = req.file;

        // 检查是否有加密数据
        if (req.body.encryptedData && req.body.key) {
            try {
                // 解密数据
                const bytes = CryptoJS.AES.decrypt(req.body.encryptedData, req.body.key);
                const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

                // 从解密后的数据中提取参数
                name = decryptedData.name;
                prompt_text = decryptedData.prompt_text;
                prompt_language = decryptedData.prompt_language;
                username = decryptedData.username;
            } catch (decryptError) {
                console.error('解密请求数据失败:', decryptError);
                return res.status(400).json({ message: '解密请求数据失败' });
            }
        } else {
            // 兼容未加密的请求
            name = req.body.name;
            prompt_text = req.body.prompt_text;
            prompt_language = req.body.prompt_language;
        }

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
        
        // 如果请求中没有提供用户名（从加密数据中），使用数据库中的用户名
        if (!username) {
            username = userResults[0].username;
        }

        // 读取文件并上传到 OSS
        const fileBuffer = fs.readFileSync(ref_wav_file.path);
        const fileName = `preset_${userId}_${Date.now()}_${ref_wav_file.originalname}`;
        const ossResult = await uploadToOSS(fileBuffer, fileName, username, 'v2ProPlus');

        // 删除临时文件
        fs.unlinkSync(ref_wav_file.path);

        // 保存到数据库
        const insertQuery = `
            INSERT INTO voice_presets (user_id, name, ref_audio_url, prompt_text, prompt_language, is_shared)
            VALUES (?, ?, ?, ?, ?, 0)
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
            SELECT id, name, ref_audio_url, prompt_text, prompt_language, is_shared, use_count, created_at, updated_at
            FROM voice_presets
            WHERE user_id = ?
            ORDER BY updated_at DESC
        `;
        const [results] = await pool.query(query, [userId]);

        // 检查请求是否包含加密密钥（表示客户端支持加密）
        if (req.query.key) {
            try {
                // 加密预设列表数据
                const encryptedData = CryptoJS.AES.encrypt(
                    JSON.stringify({ presets: results }),
                    req.query.key
                ).toString();
                
                res.json({ 
                    encryptedData,
                    key: req.query.key
                });
            } catch (encryptError) {
                console.error('加密预设列表失败:', encryptError);
                // 如果加密失败，返回未加密的数据（向后兼容）
                res.json({ presets: results });
            }
        } else {
            // 兼容未加密的请求
            res.json({ presets: results });
        }
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

// 获取公开的预设列表（圈子）
const getPublicPresets = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const query = `
            SELECT 
                vp.id, 
                vp.name, 
                vp.ref_audio_url, 
                vp.prompt_text, 
                vp.prompt_language, 
                vp.use_count,
                vp.created_at, 
                vp.updated_at,
                u.username as author_name
            FROM voice_presets vp
            INNER JOIN users u ON vp.user_id = u.id
            WHERE vp.is_shared = 1
            ORDER BY vp.updated_at DESC
            LIMIT ? OFFSET ?
        `;
        const [results] = await pool.query(query, [limit, offset]);

        // 获取总数
        const countQuery = 'SELECT COUNT(*) as total FROM voice_presets WHERE is_shared = 1';
        const [countResults] = await pool.query(countQuery);
        const total = countResults[0].total;

        // 检查请求是否包含加密密钥（表示客户端支持加密）
        if (req.query.key) {
            try {
                // 加密预设列表数据
                const encryptedData = CryptoJS.AES.encrypt(
                    JSON.stringify({ presets: results, total, page, limit }),
                    req.query.key
                ).toString();
                
                res.json({ 
                    encryptedData,
                    key: req.query.key
                });
            } catch (encryptError) {
                console.error('加密预设列表失败:', encryptError);
                res.json({ presets: results, total, page, limit });
            }
        } else {
            res.json({ presets: results, total, page, limit });
        }
    } catch (error) {
        console.error('获取公开预设列表失败:', error);
        res.status(500).json({ message: '获取公开预设列表失败' });
    }
};

// 分享/取消分享预设
const toggleSharePreset = async (req, res) => {
    try {
        const userId = req.user.id;
        const presetId = req.params.id;
        const { is_shared } = req.body;

        // 验证预设是否属于当前用户
        const checkQuery = 'SELECT id FROM voice_presets WHERE id = ? AND user_id = ?';
        const [checkResults] = await pool.query(checkQuery, [presetId, userId]);

        if (checkResults.length === 0) {
            return res.status(404).json({ message: '预设不存在或无权访问' });
        }

        // 更新分享状态
        const updateQuery = 'UPDATE voice_presets SET is_shared = ? WHERE id = ? AND user_id = ?';
        await pool.query(updateQuery, [is_shared ? 1 : 0, presetId, userId]);

        res.json({ 
            message: is_shared ? '预设已分享到圈子' : '预设已取消分享',
            is_shared: is_shared ? 1 : 0
        });
    } catch (error) {
        console.error('更新预设分享状态失败:', error);
        res.status(500).json({ message: '更新预设分享状态失败' });
    }
};

// 增加预设使用次数
const incrementPresetUseCount = async (req, res) => {
    try {
        const presetId = req.params.id;

        // 验证预设是否存在
        const checkQuery = 'SELECT id FROM voice_presets WHERE id = ?';
        const [checkResults] = await pool.query(checkQuery, [presetId]);

        if (checkResults.length === 0) {
            return res.status(404).json({ message: '预设不存在' });
        }

        // 增加使用次数
        const updateQuery = 'UPDATE voice_presets SET use_count = use_count + 1 WHERE id = ?';
        await pool.query(updateQuery, [presetId]);

        // 获取更新后的使用次数
        const getCountQuery = 'SELECT use_count FROM voice_presets WHERE id = ?';
        const [countResults] = await pool.query(getCountQuery, [presetId]);
        const useCount = countResults[0].use_count;

        res.json({ 
            message: '使用次数已更新',
            use_count: useCount
        });
    } catch (error) {
        console.error('增加预设使用次数失败:', error);
        res.status(500).json({ message: '增加预设使用次数失败' });
    }
};

// 初始化表（在模块加载时执行）
initPresetTable();

module.exports = {
    savePreset,
    getPresets,
    deletePreset,
    getPublicPresets,
    toggleSharePreset,
    incrementPresetUseCount
};

