const path = require('path');
const fs = require('fs');

const AUDIO_DIR = path.join(__dirname, '../../audio_files');
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR);
}

// DeepSeek API 配置
const DEEPSEEK_API_KEY = 'sk-65061bf460e14ec283f1f0d287827ba4';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

module.exports = {
    AUDIO_DIR,
    DEEPSEEK_API_KEY,
    DEEPSEEK_API_URL
}; 