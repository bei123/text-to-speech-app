require('dotenv').config();

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

// 验证必要的环境变量
if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    console.error('数据库配置错误：缺少必要的环境变量');
    console.error('请检查 .env 文件中的以下配置：');
    console.error('DB_HOST:', DB_HOST ? '已设置' : '未设置');
    console.error('DB_USER:', DB_USER ? '已设置' : '未设置');
    console.error('DB_PASSWORD:', DB_PASSWORD ? '已设置' : '未设置');
    console.error('DB_NAME:', DB_NAME ? '已设置' : '未设置');
    throw new Error('数据库配置不完整');
}

module.exports = {
    DB_HOST,
    DB_USER,
    DB_PASSWORD,
    DB_NAME
}; 