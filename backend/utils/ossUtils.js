import OSS from 'ali-oss';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env') });

const {
    OSS_ACCESS_KEY_ID,
    OSS_ACCESS_KEY_SECRET,
    OSS_BUCKET,
    OSS_REGION
} = process.env;

// 验证必要的环境变量
if (!OSS_ACCESS_KEY_ID || !OSS_ACCESS_KEY_SECRET || !OSS_BUCKET || !OSS_REGION) {
    throw new Error('缺少必要的OSS配置信息，请检查.env文件');
}

// 获取OSS客户端实例
export const getOSSClient = () => {
    return new OSS({
        accessKeyId: OSS_ACCESS_KEY_ID,
        accessKeySecret: OSS_ACCESS_KEY_SECRET,
        bucket: OSS_BUCKET,
        region: OSS_REGION,
        endpoint: `https://oss-${OSS_REGION}.aliyuncs.com`
    });
}; 