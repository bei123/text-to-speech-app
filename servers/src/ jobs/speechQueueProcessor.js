import { speechQueue } from '../queues/speechQueue.js';
import SpeechService from '../services/speechService.js';
import { pool } from '../utils/database.js';

speechQueue.process(2, async (job) => {
  try {
    const result = await SpeechService.generateSpeech(job.data);
    return result;
  } catch (error) {
    await pool.query(
      'UPDATE audio_requests SET status = ? WHERE id = ?',
      ['failed', job.data.requestId]
    );
    throw error;
  }
});