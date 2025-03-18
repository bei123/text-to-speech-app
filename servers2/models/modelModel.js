const pool = require('../config/db');

exports.getModels = async () => {
    const query = 'SELECT value, label, avatar_url FROM models';
    const [results] = await pool.query(query);
    return results;
};