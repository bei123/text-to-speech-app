const mysql = require('mysql2/promise');
const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = require('./config/database');

async function migrate() {
    const pool = await mysql.createPool({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME
    });

    try {
        // 添加 oss_url 字段
        await pool.query(`
            ALTER TABLE audio_requests 
            ADD COLUMN IF NOT EXISTS oss_url TEXT
        `);
        
        console.log('数据库迁移成功');
    } catch (error) {
        console.error('数据库迁移失败:', error);
    } finally {
        await pool.end();
    }
}

migrate(); 