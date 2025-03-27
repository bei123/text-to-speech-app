require('dotenv').config();
const OSS = require('ali-oss');

// 检查必要的环境变量
const requiredEnvVars = ['OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_SECRET', 'OSS_BUCKET', 'OSS_REGION'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('缺少必要的环境变量:', missingEnvVars.join(', '));
    throw new Error('缺少必要的环境变量');
}

// 创建 OSS 客户端实例
const ossClient = new OSS({
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,     // 从环境变量获取 AccessKey ID
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET, // 从环境变量获取 AccessKey Secret
    bucket: process.env.OSS_BUCKET,                 // 存储空间名称
    region: process.env.OSS_REGION,                 // 存储空间所在地域
    secure: true                                    // 使用 HTTPS
});

// 测试 OSS 连接
ossClient.listBuckets().then(() => {
    console.log('OSS 连接成功');
}).catch(err => {
    console.error('OSS 连接失败:', err);
    throw err;
});

module.exports = ossClient; 