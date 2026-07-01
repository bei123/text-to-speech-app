const path = require('path');
const fs = require('fs');

const AUDIO_DIR = process.env.AUDIO_FILES_DIR
    ? path.resolve(process.env.AUDIO_FILES_DIR)
    : path.join(__dirname, '../audio_files');
const TEMP_DIR = path.join(AUDIO_DIR, 'temp');

for (const dir of [AUDIO_DIR, TEMP_DIR]) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// DeepSeek API 配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL;

module.exports = {
    AUDIO_DIR,
    TEMP_DIR,
    DEEPSEEK_API_KEY,
    DEEPSEEK_API_URL
};
