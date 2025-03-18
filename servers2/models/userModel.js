const pool = require('../config/db');

exports.findUserByUsername = async (username) => {
    const query = 'SELECT * FROM users WHERE username = ?';
    const [results] = await pool.query(query, [username]);
    return results[0];
};

exports.insertUser = async (username, email, passwordHash) => {
    const query = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';
    await pool.query(query, [username, email, passwordHash]);
};