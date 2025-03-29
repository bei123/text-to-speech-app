const OSS = require('ali-oss');
require('dotenv').config();

const {
    OSS_ACCESS_KEY_ID,
    OSS_ACCESS_KEY_SECRET,
    OSS_BUCKET,
    OSS_REGION
} = process.env;

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

module.exports = {
    getOSSClient
}; 