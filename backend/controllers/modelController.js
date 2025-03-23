const crypto = require('crypto');
const pool = require('../config/db');
const redisClient = require('../config/redis');
const { encryptResponse, decryptRequest } = require('../utils/encryption');

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

// 获取模型对应的提示词
const getModelPrompt = async (req, res) => {
    try {
        // 获取和验证加密数据
        const { encryptedData, key } = req.body;
        if (!encryptedData || !key) {
            return res.status(400).json({ message: '请求格式不正确' });
        }

        // 解密请求数据
        const decryptedData = decryptRequest(encryptedData, key);
        if (!decryptedData) {
            return res.status(400).json({ message: '数据解密失败' });
        }

        const { model_name, username } = decryptedData;
        if (!model_name || !username) {
            return res.status(400).json({ message: '请求参数不完整' });
        }

        // 从数据库获取模型对应的提示词 - 直接从models表获取
        const query = 'SELECT system_prompt FROM models WHERE value = ?';
        const [results] = await pool.query(query, [model_name]);

        let promptData;
        if (results.length === 0) {
            // 如果没有找到对应的提示词，返回默认提示词
            promptData = { 
                prompt: '你是一个有用的AI助手，请根据用户的指令提供帮助。',
                modelName: model_name
            };
        } else {
            // 返回找到的提示词
            promptData = {
                prompt: results[0].system_prompt,
                modelName: model_name
            };
        }

        // 加密响应数据
        const encryptedResponse = encryptResponse(promptData, key);

        // 返回加密的响应数据
        res.json({
            encryptedData: encryptedResponse,
            key: key
        });
    } catch (error) {
        console.error('获取模型提示词失败:', error);
        res.status(500).json({ message: '获取模型提示词失败' });
    }
};

module.exports = {
    getModels,
    getModelPrompt
}; 