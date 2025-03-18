const Bull = require('bull');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { insertAudioFile, updateAudioRequestStatus } = require('../models/audioModel');

const AUDIO_DIR = path.join(__dirname, '../../audio_files');
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR);
}

const speechQueue = new Bull('speechGeneration', {
    redis: 'redis://localhost:6379'
});

speechQueue.process(2, async (job) => {
    const { text, text_language, model_name, userId, userEmail, username, requestId } = job.data;

    try {
        await updateAudioRequestStatus('processing', requestId);

        const response = await axios.post('http://192.168.0.53:9646/', {
            text,
            text_language,
            model_name
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer'
        });

        const fileName = `${username}_${model_name}_${Date.now()}.wav`;
        const filePath = path.join(AUDIO_DIR, fileName);

        fs.writeFileSync(filePath, response.data);

        await updateAudioRequestStatus('completed', requestId);
        await insertAudioFile(requestId, fileName, filePath);

        return `http://aittsssh.2000gallery.art:9005/download/${fileName}`;
    } catch (error) {
        console.error('生成语音失败:', error);
        await updateAudioRequestStatus('failed', requestId);
        throw new Error('生成语音失败');
    }
});

module.exports = speechQueue;