const axios = require('axios');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const redisClient = require('../services/redisService');
const speechQueue = require('../queues/speechQueue');

const AUDIO_DIR = path.join(__dirname, '../../audio_files');
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR);
}

exports.generateSpeech = async (req, res) => {
    const { text, text_language, model_name } = req.body;
    const userId = req.user.id;

    const cacheKey = `speech:${userId}:${text}:${text_language}:${model_name}`;

    try {
        const cachedResult = await redisClient.get(cacheKey);
        if (cachedResult) {
            return res.json({ downloadLink: cachedResult });
        }

        const getUserQuery = 'SELECT username, email FROM users WHERE id = ?';
        const [userResults] = await pool.query(getUserQuery, [userId]);
        const username = userResults[0].username;
        const userEmail = userResults[0].email;

        const insertRequestQuery = `
            INSERT INTO audio_requests (user_id, user_email, text, model_name, text_language, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [requestResult] = await pool.query(insertRequestQuery, [userId, userEmail, text, model_name, text_language, 'pending']);

        const job = await speechQueue.add({
            text,
            text_language,
            model_name,
            userId,
            userEmail,
            username,
            requestId: requestResult.insertId
        });

        await pool.query('UPDATE audio_requests SET job_id = ? WHERE id = ?', [job.id, requestResult.insertId]);

        const downloadLink = await job.finished();
        await redisClient.set(cacheKey, downloadLink, 'EX', 3600);

        const ttl = await redisClient.ttl(cacheKey);
        console.log(`缓存键 ${cacheKey} 的 TTL: ${ttl} 秒`);

        res.json({ downloadLink });
    } catch (error) {
        console.error('生成语音失败:', error);
        res.status(500).json({ message: '生成语音失败' });
    }
};

exports.downloadAudio = (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(AUDIO_DIR, fileName);

    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).json({ message: '文件未找到' });
    }
};

exports.getHistory = async (req, res) => {
    const userId = req.user.id;
    const { keyword, page = 1, itemsPerPage = 10 } = req.query;

    try {
        let query = `
            SELECT 
                ar.id, 
                ar.text, 
                m.label AS model_name,
                ar.text_language, 
                ar.created_at AS createdAt, 
                ar.status,
                CONCAT('http://aittsssh.2000gallery.art:9005/download/', af.file_name) AS audioUrl
            FROM 
                audio_requests ar
            LEFT JOIN 
                audio_files af ON ar.id = af.request_id
            LEFT JOIN 
                models m ON ar.model_name = m.value
            WHERE 
                ar.user_id = ?
        `;

        if (keyword && keyword.trim()) {
            query += ` AND ar.text LIKE ?`;
        }

        query += ` ORDER BY ar.created_at DESC LIMIT ? OFFSET ?`;

        const params = [userId];
        if (keyword && keyword.trim()) {
            params.push(`%${keyword.trim()}%`);
        }

        const offset = (parseInt(page) - 1) * parseInt(itemsPerPage);
        params.push(parseInt(itemsPerPage), offset);

        const [results] = await pool.query(query, params);

        let countQuery = `
            SELECT COUNT(*) AS total 
            FROM audio_requests ar
            WHERE ar.user_id = ?
        `;
        if (keyword && keyword.trim()) {
            countQuery += ` AND ar.text LIKE ?`;
        }

        const countParams = [userId];
        if (keyword && keyword.trim()) {
            countParams.push(`%${keyword.trim()}%`);
        }

        const [totalResults] = await pool.query(countQuery, countParams);
        const total = totalResults[0].total;

        res.json({
            data: results,
            total,
            page: parseInt(page),
            itemsPerPage: parseInt(itemsPerPage)
        });
    } catch (error) {
        console.error('获取历史记录失败:', error);
        res.status(500).json({ message: '获取历史记录失败' });
    }
};