const mysql = require('mysql2/promise');

// 数据库连接池
const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'text_to_speech',
    password: 'KSrJpjNsCSfp8WRH',
    database: 'text_to_speech',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

module.exports = pool; 