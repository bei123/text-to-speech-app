const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const redis = require('redis');
const Bull = require('bull');
const crypto = require('crypto');
const CryptoJS = require('crypto-js'); // 确保导入 CryptoJS
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Redis 客户端初始化
const redisClient = redis.createClient({
    url: 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});

redisClient.connect();

// Bull 任务队列初始化
const speechQueue = new Bull('speechGeneration', {
    redis: 'redis://localhost:6379'
});

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

// 音频文件保存路径
const AUDIO_DIR = path.join(__dirname, 'audio_files');
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR);
}

// JWT 验证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: '未提供 Token' });
    }

    jwt.verify(token, 'your_jwt_secret', (err, user) => {
        if (err) {
            return res.status(401).json({
                message: 'Token 无效或已过期',
                code: 'TOKEN_INVALID_OR_EXPIRED'
            });
        }
        req.user = user;
        next();
    });
};

// 任务队列处理器
speechQueue.process(async (job) => {
    const { text, text_language, model_name, userId, userEmail, username, requestId } = job.data;

    try {
        // 更新任务状态为 processing
        await pool.query('UPDATE audio_requests SET status = ? WHERE id = ?', ['processing', requestId]);

        // 调用外部 API 生成语音
        const response = await axios.post('http://192.168.0.53:9646/', {
            text,
            text_language,
            model_name
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer'
        });

        // 生成文件名和保存路径
        const fileName = `${username}_${model_name}_${Date.now()}.wav`;
        const filePath = path.join(AUDIO_DIR, fileName);

        // 保存音频文件
        fs.writeFileSync(filePath, response.data);

        // 更新任务状态为 completed
        await pool.query('UPDATE audio_requests SET status = ? WHERE id = ?', ['completed', requestId]);

        // 记录音频文件信息
        const insertFileQuery = `
            INSERT INTO audio_files (request_id, file_name, file_path)
            VALUES (?, ?, ?)
        `;
        await pool.query(insertFileQuery, [requestId, fileName, filePath]);

        // 返回下载链接
        return `http://aidudio.2000gallery.art:5000/download/${fileName}`;
    } catch (error) {
        console.error('生成语音失败:', error);
        await pool.query('UPDATE audio_requests SET status = ? WHERE id = ?', ['failed', requestId]);
        throw new Error('生成语音失败');
    }
});

// 用户注册
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // 检查用户名和邮箱是否已存在
        const checkUserQuery = 'SELECT * FROM users WHERE username = ? OR email = ?';
        const [results] = await pool.query(checkUserQuery, [username, email]);

        if (results.length > 0) {
            return res.status(400).json({ message: '用户名或邮箱已存在' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 插入新用户
        const insertUserQuery = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';
        await pool.query(insertUserQuery, [username, email, passwordHash]);

        res.status(201).json({ message: '用户注册成功' });
    } catch (error) {
        console.error('注册失败:', error);
        res.status(500).json({ message: '注册失败' });
    }
});

// 生成一个随机的加密密钥
const generateEncryptionKey = () => {
    return crypto.randomBytes(32).toString('hex'); // 生成 256 位的随机密钥
};

// 提供加密密钥的接口
app.get('/api/encryption-key', async (req, res) => {
    try {
        const encryptionKey = generateEncryptionKey(); // 每次请求生成一个新的密钥
        const username = req.query.username; // 获取用户名

        // 将密钥存储在 Redis 中，设置过期时间（例如 5 分钟）
        await redisClient.set(`encryptionKey:${username}`, encryptionKey, 'EX', 300);

        res.json({ key: encryptionKey });
    } catch (error) {
        console.error('生成加密密钥失败:', error);
        res.status(500).json({ message: '生成加密密钥失败' });
    }
});

// 解密密码函数
const decryptPassword = (encryptedPassword, secretKey) => {
    if (!encryptedPassword) {
        throw new Error('加密密码为空');
    }
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, secretKey); // 解密
    const decryptedPassword = bytes.toString(CryptoJS.enc.Utf8); // 转换为 UTF-8 字符串
    if (!decryptedPassword) {
        throw new Error('解密失败，密钥可能不匹配');
    }
    return decryptedPassword;
};

// 用户登录接口
app.post('/login', async (req, res) => {
    const { username, encryptedPassword } = req.body;

    try {
        // 查找用户
        const findUserQuery = 'SELECT * FROM users WHERE username = ?';
        const [results] = await pool.query(findUserQuery, [username]);

        if (results.length === 0) {
            return res.status(400).json({ message: '用户名或密码错误' });
        }

        const user = results[0];

        // 从 Redis 中获取加密密钥
        const secretKey = await redisClient.get(`encryptionKey:${username}`);
        if (!secretKey) {
            return res.status(400).json({ message: '加密密钥无效' });
        }

        // 解密密码
        const decryptedPassword = decryptPassword(encryptedPassword, secretKey);
        // console.log('解密后的密码:', decryptedPassword);

        // 验证密码
        const isMatch = await bcrypt.compare(decryptedPassword, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: '用户名或密码错误' });
        }

        // 生成 Access Token
        const accessToken = jwt.sign({ id: user.id }, 'your_jwt_secret', { expiresIn: '15m' });

        // 生成 Refresh Token
        const refreshToken = jwt.sign({ id: user.id }, 'your_refresh_secret', { expiresIn: '7d' });

        // 返回的用户信息
        const userResponse = {
            id: user.id,
            username: user.username,
            email: user.email,
        };

        // 记录登录信息
        const userAgent = req.headers['user-agent'];
        const ipAddress = req.ip || req.connection.remoteAddress;

        const insertLoginLogQuery = `
            INSERT INTO user_login_logs (user_id, user_agent, ip_address)
            VALUES (?, ?, ?)
        `;
        await pool.query(insertLoginLogQuery, [user.id, userAgent, ipAddress]);

        // 返回登录成功信息
        res.json({
            accessToken,
            refreshToken,
            user: userResponse
        });
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({ message: '登录失败' });
    }
});

// 刷新 Token
app.post('/refresh-token', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ message: '未提供 Refresh Token' });
    }

    try {
        // 验证 Refresh Token
        jwt.verify(refreshToken, 'your_refresh_secret', (err, user) => {
            if (err) {
                return res.status(403).json({ message: 'Refresh Token 无效或已过期' });
            }

            // 生成新的 Access Token
            const newAccessToken = jwt.sign({ id: user.id }, 'your_jwt_secret', { expiresIn: '15m' });

            // 返回新的 Access Token
            res.json({ accessToken: newAccessToken });
        });
    } catch (error) {
        console.error('刷新 Token 失败:', error);
        res.status(500).json({ message: '刷新 Token 失败' });
    }
});

// 受保护的路由
app.get('/protected', authenticateToken, (req, res) => {
    res.json({ message: '这是受保护的路由', user: req.user });
});

// 获取模型数据
app.get('/models', async (req, res) => {
    try {
        const query = 'SELECT value, label, avatar_url FROM models';
        const [results] = await pool.query(query);
        res.json(results);
    } catch (error) {
        console.error('获取模型数据失败:', error);
        res.status(500).json({ message: '获取模型数据失败' });
    }
});

app.post('/generate-speech', authenticateToken, async (req, res) => {
    const { text, text_language, model_name } = req.body;
    const userId = req.user.id;

    // 缓存键
    const cacheKey = `speech:${userId}:${text}:${text_language}:${model_name}`;

    try {
        // 检查缓存
        const cachedResult = await redisClient.get(cacheKey);
        if (cachedResult) {
            return res.json({ downloadLink: cachedResult });
        }

        // 获取用户信息
        const getUserQuery = 'SELECT username, email FROM users WHERE id = ?';
        const [userResults] = await pool.query(getUserQuery, [userId]);
        const username = userResults[0].username; // 获取用户名
        const userEmail = userResults[0].email;

        // 插入初始状态为 pending 的任务
        const insertRequestQuery = `
            INSERT INTO audio_requests (user_id, user_email, text, model_name, text_language, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [requestResult] = await pool.query(insertRequestQuery, [userId, userEmail, text, model_name, text_language, 'pending']);

        // 添加任务到队列
        const job = await speechQueue.add({
            text,
            text_language,
            model_name,
            userId,
            userEmail,
            username, // 将用户名传递给任务处理器
            requestId: requestResult.insertId // 传递任务 ID
        });

        // 更新任务 ID
        await pool.query('UPDATE audio_requests SET job_id = ? WHERE id = ?', [job.id, requestResult.insertId]);

        // 等待任务完成
        const downloadLink = await job.finished();

        // 缓存结果
        await redisClient.set(cacheKey, downloadLink, 'EX', 3600); // 缓存1小时

        // 检查缓存的 TTL
        const ttl = await redisClient.ttl(cacheKey);
        console.log(`缓存键 ${cacheKey} 的 TTL: ${ttl} 秒`);

        // 返回下载链接
        res.json({ downloadLink });
    } catch (error) {
        console.error('生成语音失败:', error);
        res.status(500).json({ message: '生成语音失败' });
    }
});

// 下载音频文件 API
app.get('/download/:fileName', (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(AUDIO_DIR, fileName);

    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).json({ message: '文件未找到' });
    }
});

// DeepSeek API 配置
const DEEPSEEK_API_KEY = 'sk-65061bf460e14ec283f1f0d287827ba4';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

app.post('/call-deepseek', async (req, res) => {
    try {
        const { prompt, system = '' } = req.body;

        const headers = {
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json',
        };

        const payload = {
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: prompt },
            ],
            model: "deepseek-chat",
            max_tokens: 500,
        };

        const response = await axios.post(DEEPSEEK_API_URL, payload, { headers });

        // 获取 API 返回的文本
        let text = response.data.choices[0].message.content;

        // 保留中文、英文、数字、空格和常用标点符号，移除其他特殊字符
        text = text.replace(/[^\w\s\u4e00-\u9fa5,.!?，。！？]/g, ''); // 保留中英文、数字、空格和常用标点符号

        res.json({ text });
    } catch (error) {
        console.error('调用 DeepSeek API 失败:', error.response?.data || error.message);
        res.status(500).json({ error: '调用 DeepSeek API 失败' });
    }
});

// 获取用户历史语音记录
app.get('/history', authenticateToken, async (req, res) => {
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
                ar.status,  -- 返回任务状态
                CONCAT('http://aidudio.2000gallery.art:5000/download/', af.file_name) AS audioUrl
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

        // 获取总记录数
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
});

// 启动服务器
const PORT = 5000; // 直接硬编码端口号
app.listen(PORT, () => {
    console.log(`服务器运行在 http://aidudio.2000gallery.art:${PORT}`);
});