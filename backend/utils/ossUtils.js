const OSS = require('ali-oss');
const { OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET, OSS_REGION } = require('../config/oss');

// 创建 OSS 客户端
const client = new OSS({
    accessKeyId: OSS_ACCESS_KEY_ID,
    accessKeySecret: OSS_ACCESS_KEY_SECRET,
    bucket: OSS_BUCKET,
    region: OSS_REGION,
    endpoint: `https://oss-${OSS_REGION}.aliyuncs.com`,
    secure: true
});

// 生成唯一的文件名
const generateUniqueFileName = (fileName, modelName) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    return `${modelName}_${timestamp}-${randomString}.wav`;
};

/**
 * 上传文件到 OSS
 * @param {Buffer|Object} file - 文件内容或文件对象
 * @param {string} username - 用户名
 * @param {string} fileName - 文件名
 * @param {string} modelName - 模型名称
 * @returns {Promise<Object>} - 返回包含 ossPath 和 url 的对象
 */
const uploadToOSS = async (fileBuffer, username, fileName, modelName) => {
    try {
        const uniqueFileName = generateUniqueFileName(fileName, modelName);
        const ossPath = `audio/${username}/${uniqueFileName}`;
        
        // 上传文件
        const result = await client.put(ossPath, fileBuffer);
        
        // 生成带有 CORS 支持的 URL
        const url = client.signatureUrl(ossPath, {
            expires: 3600, // URL 有效期 1 小时
            method: 'GET',
            response: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE',
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Expose-Headers': 'ETag, Content-Length',
                'Access-Control-Max-Age': '3600'
            }
        });
        
        return {
            url: url,
            ossPath: ossPath
        };
    } catch (error) {
        console.error('上传到 OSS 失败:', error);
        throw error;
    }
};

/**
 * 从 OSS 删除文件
 * @param {string} fileName - 文件名
 * @param {string} username - 用户名
 * @returns {Promise<void>}
 */
async function deleteFromOSS(fileName, username) {
    try {
        // 构建 OSS 路径：audio/用户名/文件名
        const ossPath = `audio/${username}/${fileName}`;
        await client.delete(ossPath);
    } catch (error) {
        console.error('从 OSS 删除文件失败:', error);
        throw error;
    }
}

module.exports = {
    uploadToOSS,
    deleteFromOSS,
    generateUniqueFileName
}; 