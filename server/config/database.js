const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 创建连接池
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'text_to_speech_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 初始化数据库表
const initDatabase = async () => {
    try {
        // 测试连接
        await pool.query('SELECT 1');
        console.log('数据库连接成功');

        // 读取初始化SQL
        const sqlPath = path.join(__dirname, '../models/init_db.sql');
        if (fs.existsSync(sqlPath)) {
            const sql = fs.readFileSync(sqlPath, 'utf8');
            const statements = sql.split(';').filter(stmt => stmt.trim() !== '');

            // 执行每个SQL语句
            for (const statement of statements) {
                await pool.query(statement);
            }
            console.log('数据库表初始化完成');
        }
    } catch (error) {
        console.error('数据库初始化失败:', error.message);
        // 如果是开发环境，可以容忍数据库连接失败
        if (process.env.NODE_ENV !== 'development') {
            process.exit(1);
        }
    }
};

// 导出连接池和初始化函数
module.exports = {
    pool,
    initDatabase
}; 