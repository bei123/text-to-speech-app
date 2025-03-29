const OSS = require('ali-oss');
const { OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET, OSS_REGION, OSS_ENDPOINT } = process.env;
const { v4: uuidv4 } = require('uuid');

// 获取OSS客户端实例
const getOSSClient = () => {
    return new OSS({
        accessKeyId: OSS_ACCESS_KEY_ID,
        accessKeySecret: OSS_ACCESS_KEY_SECRET,
        bucket: OSS_BUCKET,
        region: OSS_REGION,
        endpoint: `https://oss-${OSS_REGION}.aliyuncs.com`
    });
};

// 配置OSS CORS规则
const configureOSSCORS = async () => {
    try {
        const client = getOSSClient();
        
        // 设置CORS规则
        const rules = [{
            // 指定允许跨域请求的来源
            allowedOrigin: '*',
            // 指定允许的跨域请求方法
            allowedMethod: 'GET,HEAD,PUT,POST,DELETE,OPTIONS',
            // 指定允许跨域请求的响应头
            allowedHeader: '*',
            // 指定允许用户从应用程序中访问的响应头
            exposeHeader: 'ETag,x-oss-request-id',
            // 指定浏览器对特定资源的预取（OPTIONS）请求返回结果的缓存时间
            maxAgeSeconds: '30'
        }];
        
        // 传入 bucket 名称和规则
        await client.putBucketCORS(OSS_BUCKET, rules);
        console.log('OSS CORS规则配置成功');
    } catch (error) {
        console.error('配置OSS CORS规则失败:', error);
        throw error;
    }
};

// 生成唯一的文件名
const generateUniqueFileName = (fileName, modelName) => {
    const timestamp = Date.now();
    const randomString = uuidv4().substring(0, 8);
    return `${modelName}_${timestamp}-${randomString}.wav`;
};

/**
 * 上传文件到 OSS
 * @param {Buffer|Object} file - 文件内容或文件对象
 * @param {string} fileName - 文件名
 * @param {string} username - 用户名
 * @param {string} modelName - 模型名称
 * @returns {Promise<Object>} - 返回包含 ossPath 和 url 的对象
 */
const uploadToOSS = async (file, fileName, username, modelName) => {
    try {
        const uniqueFileName = generateUniqueFileName(fileName, modelName);
        const ossPath = `audio/${username}/${uniqueFileName}`;
        
        // 上传文件
        const client = getOSSClient();
        const result = await client.put(ossPath, file);
        
        // 生成直接的OSS下载链接
        const downloadUrl = `https://${process.env.OSS_BUCKET}.oss-${process.env.OSS_REGION}.aliyuncs.com/${ossPath}`;
        
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
const deleteFromOSS = async (fileName, username) => {
    try {
        // 构建 OSS 路径：audio/用户名/文件名
        const ossPath = `audio/${username}/${fileName}`;
        const client = getOSSClient();
        await client.delete(ossPath);
    } catch (error) {
        console.error('从 OSS 删除文件失败:', error);
        throw error;
    }
};

module.exports = {
    getOSSClient,
    uploadToOSS,
    deleteFromOSS,
    configureOSSCORS,
    generateUniqueFileName
}; 