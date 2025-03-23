const crypto = require('crypto');
const pool = require('../config/db');
const redisClient = require('../config/redis');
const { encryptResponse } = require('../utils/encryption');

// 获取模型数据
const getModels = async (req, res) => {
    try {
        const query = 'SELECT value, label, avatar_url FROM models';
        const [results] = await pool.query(query);
        
        // 生成加密密钥
        const secretKey = crypto.randomBytes(32).toString('hex');
        
        // 加密响应数据
        const encryptedData = encryptResponse(results, secretKey);

        // 将密钥存储在 Redis 中，设置过期时间（5分钟）
        await redisClient.set('modelKey', secretKey, 'EX', 300);

        // 返回加密后的数据
        res.json({
            encryptedData,
            key: secretKey
        });
    } catch (error) {
        console.error('获取模型数据失败:', error);
        res.status(500).json({ message: '获取模型数据失败' });
    }
};

module.exports = {
    getModels
}; 