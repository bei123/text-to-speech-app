// src/utils/cryptoUtils.js
import crypto from 'crypto';
import config from '../config/index.js';

// 加密算法配置
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 推荐12字节的GCM IV
const SALT_LENGTH = 16;
const KEY_DERIVATION = {
  iterations: 10000,
  digest: 'sha512',
  keyLength: 32
};

export default {
  /**
   * 生成随机加密密钥（base64编码）
   * @returns {string} base64编码的加密密钥
   */
  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('base64');
  },

  /**
   * 加密数据（带认证标签）
   * @param {string} plaintext - 明文数据 
   * @param {string} encryptionKey - base64编码的加密密钥
   * @returns {string} 加密后的字符串（iv:authTag:ciphertext）
   */
  encryptData(plaintext, encryptionKey) {
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const key = Buffer.from(encryptionKey, 'base64');
      
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
      ciphertext += cipher.final('base64');
      
      return [
        iv.toString('base64'),
        cipher.getAuthTag().toString('base64'),
        ciphertext
      ].join(':');
    } catch (error) {
      throw new Error('ENCRYPTION_FAILED');
    }
  },

  /**
   * 解密数据（带完整性验证）
   * @param {string} encryptedData - 加密后的字符串
   * @param {string} encryptionKey - base64编码的加密密钥
   * @returns {string} 解密后的明文
   */
  decryptData(encryptedData, encryptionKey) {
    try {
      const [ivBase64, authTagBase64, ciphertext] = encryptedData.split(':');
      const key = Buffer.from(encryptionKey, 'base64');
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
      plaintext += decipher.final('utf8');
      
      return plaintext;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('INVALID_ENCRYPTED_FORMAT');
      }
      throw new Error('DECRYPTION_FAILED');
    }
  },

  /**
   * 从密码派生加密密钥（PBKDF2）
   * @param {string} password - 用户密码
   * @param {string} salt - base64编码的盐值（可选）
   * @returns {object} { key: base64密钥, salt: base64盐值 }
   */
  deriveKeyFromPassword(password, salt) {
    try {
      const saltBuf = salt 
        ? Buffer.from(salt, 'base64')
        : crypto.randomBytes(SALT_LENGTH);

      const key = crypto.pbkdf2Sync(
        password,
        saltBuf,
        KEY_DERIVATION.iterations,
        KEY_DERIVATION.keyLength,
        KEY_DERIVATION.digest
      );

      return {
        key: key.toString('base64'),
        salt: saltBuf.toString('base64')
      };
    } catch (error) {
      throw new Error('KEY_DERIVATION_FAILED');
    }
  },

  /**
   * 验证加密密钥格式
   * @param {string} key - 待验证的密钥
   */
  validateEncryptionKey(key) {
    try {
      const buf = Buffer.from(key, 'base64');
      return buf.length === 32;
    } catch {
      return false;
    }
  }
};