const ossClient = require('../config/oss');
const path = require('path');

/**
 * 上传文件到 OSS
 * @param {Buffer} fileBuffer - 文件内容
 * @param {string} fileName - 文件名
 * @param {string} username - 用户名
 * @returns {Promise<string>} - 返回文件的访问 URL
 */
async function uploadToOSS(fileBuffer, fileName, username) {
    try {
        // 生成唯一的文件名
        const uniqueFileName = `${Date.now()}-${fileName}`;
        
        // 构建 OSS 路径：生成音频/用户名/文件名
        const ossPath = `video/${username}/${uniqueFileName}`;
        
        // 上传文件
        const result = await ossClient.put(ossPath, fileBuffer);
        
        // 返回文件的访问 URL
        return result.url;
    } catch (error) {
        console.error('上传文件到 OSS 失败:', error);
        throw error;
    }
}

/**
 * 从 OSS 删除文件
 * @param {string} fileName - 文件名
 * @param {string} username - 用户名
 * @returns {Promise<void>}
 */
async function deleteFromOSS(fileName, username) {
    try {
        // 构建 OSS 路径：生成音频/用户名/文件名
        const ossPath = `生成音频/${username}/${fileName}`;
        await ossClient.delete(ossPath);
    } catch (error) {
        console.error('从 OSS 删除文件失败:', error);
        throw error;
    }
}

module.exports = {
    uploadToOSS,
    deleteFromOSS
}; 