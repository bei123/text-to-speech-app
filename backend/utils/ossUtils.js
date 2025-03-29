import OSS from 'ali-oss';
import dotenv from 'dotenv';
dotenv.config();

const {
    OSS_ACCESS_KEY_ID,
    OSS_ACCESS_KEY_SECRET,
    OSS_BUCKET,
    OSS_REGION
} = process.env;

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