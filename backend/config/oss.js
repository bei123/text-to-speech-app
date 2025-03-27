require('dotenv').config();

const OSS_ACCESS_KEY_ID = process.env.OSS_ACCESS_KEY_ID;
const OSS_ACCESS_KEY_SECRET = process.env.OSS_ACCESS_KEY_SECRET;
const OSS_BUCKET = process.env.OSS_BUCKET;
const OSS_REGION = process.env.OSS_REGION;

// 验证必要的环境变量
if (!OSS_ACCESS_KEY_ID || !OSS_ACCESS_KEY_SECRET || !OSS_BUCKET || !OSS_REGION) {
    console.error('OSS 配置错误：缺少必要的环境变量');
    console.error('请检查 .env 文件中的以下配置：');
    console.error('OSS_ACCESS_KEY_ID:', OSS_ACCESS_KEY_ID ? '已设置' : '未设置');
    console.error('OSS_ACCESS_KEY_SECRET:', OSS_ACCESS_KEY_SECRET ? '已设置' : '未设置');
    console.error('OSS_BUCKET:', OSS_BUCKET ? '已设置' : '未设置');
    console.error('OSS_REGION:', OSS_REGION ? '已设置' : '未设置');
    throw new Error('OSS 配置不完整');
}

module.exports = {
    OSS_ACCESS_KEY_ID,
    OSS_ACCESS_KEY_SECRET,
    OSS_BUCKET,
    OSS_REGION
}; 