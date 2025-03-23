const crypto = require('crypto');
const CryptoJS = require('crypto-js');

// 生成一个随机的加密密钥
const generateEncryptionKey = () => {
    return crypto.randomBytes(32).toString('hex'); // 生成 256 位的随机密钥
};

// 解密密码函数
const decryptPassword = (encryptedPassword, secretKey) => {
    if (!encryptedPassword) {
        throw new Error('加密密码为空');
    }
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, secretKey); // 解密
    const decryptedPassword = bytes.toString(CryptoJS.enc.Utf8); // 转换为 UTF-8 字符串
    if (!decryptedPassword) {
        throw new Error('解密失败，密钥可能不匹配');
    }
    return decryptedPassword;
};

// 添加加密函数
const encryptResponse = (data, secretKey) => {
    try {
        return CryptoJS.AES.encrypt(JSON.stringify(data), secretKey).toString();
    } catch (error) {
        console.error('加密响应数据失败:', error);
        throw error;
    }
};

module.exports = {
    generateEncryptionKey,
    decryptPassword,
    encryptResponse
}; 