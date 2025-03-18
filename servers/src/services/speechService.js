import { pool } from '../utils/database.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import config from '../config/index.js';

export default class SpeechService {
  static async generateSpeech(data) {
    const { text, text_language, model_name, userId, userEmail, username, requestId } = data;
    
    await pool.query(
      'UPDATE audio_requests SET status = ? WHERE id = ?',
      ['processing', requestId]
    );

    const response = await axios.post('http://192.168.0.53:9646/', {
      text,
      text_language,
      model_name
    }, { responseType: 'arraybuffer' });

    const fileName = `${username}_${model_name}_${Date.now()}.wav`;
    const filePath = path.join(config.audioDir, fileName);
    
    fs.writeFileSync(filePath, response.data);
    
    await pool.query(
      'UPDATE audio_requests SET status = ? WHERE id = ?',
      ['completed', requestId]
    );

    await pool.query(
      'INSERT INTO audio_files (request_id, file_name, file_path) VALUES (?, ?, ?)',
      [requestId, fileName, filePath]
    );

    return `http://aidudio.2000gallery.art:5000/download/${fileName}`;
  }
}