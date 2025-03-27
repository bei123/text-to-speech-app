require('dotenv').config();
const OSS = require('ali-oss');

// 创建 OSS 客户端实例
const ossClient = new OSS({
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,     // 从环境变量获取 AccessKey ID
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET, // 从环境变量获取 AccessKey Secret
    bucket: process.env.OSS_BUCKET,                 // 存储空间名称
    region: process.env.OSS_REGION,                 // 存储空间所在地域
    secure: true                                    // 使用 HTTPS
});

module.exports = ossClient; 