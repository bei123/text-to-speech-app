const path = require('path');
const fs = require('fs');

const AUDIO_DIR = path.join(__dirname, '../../audio_files');
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR);
}

// DeepSeek API 配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL;

module.exports = {
    AUDIO_DIR,
    DEEPSEEK_API_KEY,
    DEEPSEEK_API_URL
}; 