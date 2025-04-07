const OSS = require('ali-oss');
const { v4: uuidv4 } = require('uuid');
const http = require('http');

/**
 * 检查是否在阿里云 ECS 环境中
 * @returns {Promise<boolean>}
 */
const checkIsInAliyunECS = async () => {
    return new Promise((resolve) => {
        // 尝试访问阿里云 ECS 元数据服务
        const req = http.get('http://100.100.100.200/latest/meta-data/', {
            timeout: 2000
        }, (res) => {
            resolve(res.statusCode === 200);
        });

        req.on('error', () => {
            resolve(false);
        });

        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
    });
};

/**
 * 获取合适的 OSS endpoint
 * @returns {Promise<string>}
 */
const getOSSEndpoint = async () => {
    const isInECS = await checkIsInAliyunECS();
    const region = process.env.OSS_REGION;

    if (isInECS) {
        console.log('检测到阿里云 ECS 环境，使用内网 endpoint');
        return `https://oss-${region}-internal.aliyuncs.com`;
    } else {
        console.log('未检测到阿里云 ECS 环境，使用公网 endpoint');
        return `https://oss-${region}.aliyuncs.com`;
    }
};

// 创建 OSS 客户端
let client = null;

/**
 * 初始化 OSS 客户端
 */
const initOSSClient = async () => {
    const endpoint = await getOSSEndpoint();
    client = new OSS({
        accessKeyId: process.env.OSS_ACCESS_KEY_ID,
        accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
        bucket: process.env.OSS_BUCKET,
        region: process.env.OSS_REGION,
        endpoint: endpoint
    });
    console.log('OSS 客户端初始化完成，使用 endpoint:', endpoint);
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
        // 确保 client 已初始化
        if (!client) {
            await initOSSClient();
        }

        const uniqueFileName = generateUniqueFileName(fileName, modelName);
        const ossPath = `audio/${username}/${uniqueFileName}`;

        // 上传文件，添加服务器端加密配置
        const result = await client.put(ossPath, file, {
            headers: {
                'x-oss-server-side-encryption': 'AES256'  // 使用 AES256 加密算法
            }
        });

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
        // 确保 client 已初始化
        if (!client) {
            await initOSSClient();
        }

        // 构建 OSS 路径：audio/用户名/文件名
        const ossPath = `audio/${username}/${fileName}`;
        await client.delete(ossPath);
    } catch (error) {
        console.error('从 OSS 删除文件失败:', error);
        throw error;
    }
}

// 初始化时立即检查环境并创建客户端
initOSSClient().catch(console.error);

module.exports = {
    uploadToOSS,
    deleteFromOSS,
    generateUniqueFileName
}; 