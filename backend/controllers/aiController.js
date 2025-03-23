const CryptoJS = require('crypto-js');
const axios = require('axios');
const { DEEPSEEK_API_KEY, DEEPSEEK_API_URL } = require('../utils/constants');

// 调用DeepSeek API
const callDeepseek = async (req, res) => {
    try {
        let prompt, system = '';
        
        // 检查是否有加密数据
        if (req.body.encryptedData && req.body.key) {
            try {
                // 解密数据
                const bytes = CryptoJS.AES.decrypt(req.body.encryptedData, req.body.key);
                const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
                
                // 从解密后的数据中提取参数
                prompt = decryptedData.prompt;
                system = decryptedData.system || '';
            } catch (decryptError) {
                console.error('解密请求数据失败:', decryptError);
                return res.status(400).json({ message: '解密请求数据失败' });
            }
        } else {
            // 兼容未加密的请求
            prompt = req.body.prompt;
            system = req.body.system || '';
        }
        
        // 验证必要参数
        if (!prompt) {
            return res.status(400).json({ message: '缺少必要参数' });
        }

        const headers = {
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json',
        };

        const payload = {
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: prompt },
            ],
            model: "deepseek-chat",
            max_tokens: 500,
        };

        const response = await axios.post(DEEPSEEK_API_URL, payload, { headers });

        // 获取 API 返回的文本
        let text = response.data.choices[0].message.content;

        // 保留中文、英文、数字、空格和常用标点符号，移除其他特殊字符
        text = text.replace(/[^\w\s\u4e00-\u9fa5,.!?，。！？]/g, ''); // 保留中英文、数字、空格和常用标点符号

        // 如果请求是加密的，则响应也需要加密
        if (req.body.encryptedData && req.body.key) {
            const encryptedText = CryptoJS.AES.encrypt(JSON.stringify({ text }), req.body.key).toString();
            res.json({ encryptedData: encryptedText });
        } else {
            res.json({ text });
        }
    } catch (error) {
        console.error('调用 DeepSeek API 失败:', error.response?.data || error.message);
        res.status(500).json({ error: '调用 DeepSeek API 失败' });
    }
};

module.exports = {
    callDeepseek
}; 