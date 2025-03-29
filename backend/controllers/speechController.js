import { getOSSClient } from '../utils/ossUtils.js';
import { v4 as uuidv4 } from 'uuid';

const client = getOSSClient();

// 生成语音
export const generateSpeech = async (req, res) => {
    try {
        const { text, model } = req.body;
        const username = req.user.username;

        // 生成唯一的文件名
        const timestamp = Date.now();
        const randomString = uuidv4().substring(0, 8);
        const fileName = `${model}_${timestamp}-${randomString}.wav`;
        const ossPath = `audio/${username}/${fileName}`;

        // TODO: 调用语音生成服务
        // 这里需要实现实际的语音生成逻辑

        // 返回文件URL
        const url = `https://${process.env.OSS_BUCKET}.oss-${process.env.OSS_REGION}.aliyuncs.com/${ossPath}`;

        res.json({
            success: true,
            url,
            fileName
        });
    } catch (error) {
        console.error('生成语音失败:', error);
        res.status(500).json({
            success: false,
            message: '生成语音失败',
            error: error.message
        });
    }
};

// 获取历史记录
export const getHistory = async (req, res) => {
    try {
        const username = req.user.username;
        const prefix = `audio/${username}/`;

        // 列出用户的所有音频文件
        const result = await client.list({
            prefix,
            delimiter: '/'
        });

        const files = result.objects.map(obj => ({
            fileName: obj.name.split('/').pop(),
            url: `https://${process.env.OSS_BUCKET}.oss-${process.env.OSS_REGION}.aliyuncs.com/${obj.name}`,
            lastModified: obj.lastModified
        }));

        res.json({
            success: true,
            files
        });
    } catch (error) {
        console.error('获取历史记录失败:', error);
        res.status(500).json({
            success: false,
            message: '获取历史记录失败',
            error: error.message
        });
    }
};

// 下载音频文件
export const downloadAudio = async (req, res) => {
    try {
        const { username, filename } = req.params;
        const ossClient = getOSSClient();
        
        // 设置文件路径
        const objectKey = `audio/${username}/${filename}`;
        
        try {
            // 获取文件
            const result = await ossClient.get(objectKey);
            
            // 设置响应头
            res.setHeader('Content-Type', 'audio/wav');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            
            // 发送文件内容
            res.send(result.content);
        } catch (error) {
            console.error('获取OSS文件失败:', error);
            res.status(404).json({ error: '文件不存在' });
        }
    } catch (error) {
        console.error('下载文件失败:', error);
        res.status(500).json({ error: '下载失败' });
    }
}; 