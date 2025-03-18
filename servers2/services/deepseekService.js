const axios = require('axios');

const DEEPSEEK_API_KEY = 'sk-65061bf460e14ec283f1f0d287827ba4';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

exports.callDeepSeek = async (prompt, system = '') => {
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

    let text = response.data.choices[0].message.content;
    text = text.replace(/[^\w\s\u4e00-\u9fa5,.!?，。！？]/g, '');

    return text;
};