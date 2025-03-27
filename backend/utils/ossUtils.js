const OSS = require('ali-oss');
const { v4: uuidv4 } = require('uuid');

// 创建 OSS 客户端
const client = new OSS({
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    bucket: process.env.OSS_BUCKET,
    region: process.env.OSS_REGION,
    endpoint: `https://oss-${process.env.OSS_REGION}.aliyuncs.com`
});

// 生成唯一的文件名
const generateUniqueFileName = (fileName) => {
    const timestamp = Date.now();
    const randomString = uuidv4().substring(0, 8);
    return `${timestamp}-${randomString}.wav`;
};

/**
 * 上传文件到 OSS
 * @param {Buffer|Object} file - 文件内容或文件对象
 * @param {string} fileName - 文件名
 * @param {string} username - 用户名
 * @returns {Promise<Object>} - 返回包含 ossPath 和 url 的对象
 */
const uploadToOSS = async (file, fileName, username) => {
    try {
        const uniqueFileName = generateUniqueFileName(fileName);
        const ossPath = `audio/${username}/${uniqueFileName}`;
        
        // 上传文件
        const result = await client.put(ossPath, file);
        
        // 生成带有下载参数的 URL（使用自定义域名）
        const downloadUrl = `https://oss.2000gallery.art/${ossPath}?response-content-disposition=attachment%3B%20filename%3D${encodeURIComponent(uniqueFileName)}`;
        
        return {
            ossPath,
            url: downloadUrl
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