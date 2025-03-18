const CryptoJS = require('crypto-js');

const decryptPassword = (encryptedPassword, secretKey) => {
    if (!encryptedPassword) {
        throw new Error('加密密码为空');
    }
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, secretKey);
    const decryptedPassword = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedPassword) {
        throw new Error('解密失败，密钥可能不匹配');
    }
    return decryptedPassword;
};

const generateEncryptionKey = () => {
    return crypto.randomBytes(32).toString('hex');
};

module.exports = {
    decryptPassword,
    generateEncryptionKey
};