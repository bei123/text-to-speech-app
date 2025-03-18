const pool = require('../config/db');

exports.insertAudioRequest = async (userId, userEmail, text, model_name, text_language, status) => {
    const query = `
        INSERT INTO audio_requests (user_id, user_email, text, model_name, text_language, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(query, [userId, userEmail, text, model_name, text_language, status]);
    return result;
};

exports.updateAudioRequestStatus = async (status, requestId) => {
    const query = 'UPDATE audio_requests SET status = ? WHERE id = ?';
    await pool.query(query, [status, requestId]);
};

exports.insertAudioFile = async (requestId, fileName, filePath) => {
    const query = `
        INSERT INTO audio_files (request_id, file_name, file_path)
        VALUES (?, ?, ?)
    `;
    await pool.query(query, [requestId, fileName, filePath]);
};