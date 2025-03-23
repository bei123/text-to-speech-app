const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const bcrypt = require('bcrypt');
const { authConfig } = require('../config/api');
const redisClient = require('../config/redis');

// 生成随机密钥
const generateRandomKey = () => {
    return crypto.randomBytes(32).toString('hex');
};

// 生成密码哈希
const hashPassword = async (password) => {
    return await bcrypt.hash(password, authConfig.saltRounds);
};

// 验证密码
const verifyPassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

// 存储加密密钥到Redis
const storeEncryptionKey = async (userId, key) => {
    // 为特定用户存储加密密钥
    const redisKey = `encryption_key:${userId}`;
    await redisClient.set(redisKey, key, 'EX', 24 * 60 * 60); // 24小时过期
    return key;
};

// 从Redis获取加密密钥
const getEncryptionKey = async (userId) => {
    const redisKey = `encryption_key:${userId}`;
    const key = await redisClient.get(redisKey);
    return key;
};

// 使用CryptoJS加密数据
const encryptData = (data, key) => {
    return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
};

// 使用CryptoJS解密数据
const decryptData = (encryptedData, key) => {
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

module.exports = {
    generateRandomKey,
    hashPassword,
    verifyPassword,
    storeEncryptionKey,
    getEncryptionKey,
    encryptData,
    decryptData
}; 