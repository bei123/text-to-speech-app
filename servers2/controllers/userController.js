const pool = require('../config/db');

exports.getModels = async (req, res) => {
    try {
        const query = 'SELECT value, label, avatar_url FROM models';
        const [results] = await pool.query(query);
        res.json(results);
    } catch (error) {
        console.error('获取模型数据失败:', error);
        res.status(500).json({ message: '获取模型数据失败' });
    }
};