const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 验证 JWT 的中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '未提供 Token' });
  }

  jwt.verify(token, 'your_jwt_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token 无效或已过期' });
    }
    req.user = user;
    next();
  });
};


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

// 用户登录
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // 查找用户
    const findUserQuery = 'SELECT * FROM users WHERE username = ?';
    const [results] = await pool.query(findUserQuery, [username]);

    if (results.length === 0) {
      return res.status(400).json({ message: '用户名或密码错误' });
    }

    const user = results[0];

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: '用户名或密码错误' });
    }

    // 生成 JWT
    const token = jwt.sign({ id: user.id }, 'your_jwt_secret', { expiresIn: '1h' });

    // 返回 token 和 user 信息（移除敏感字段）
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
    };

    res.json({ token, user: userResponse });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ message: '登录失败' });
  }
});


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
  const userId = req.user.id; // 从 JWT 中获取用户 ID

  try {
    // 获取当前用户的用户名
    const getUserQuery = 'SELECT username FROM users WHERE id = ?';
    const [userResults] = await pool.query(getUserQuery, [userId]);

    if (userResults.length === 0) {
      return res.status(404).json({ message: '用户未找到' });
    }

    const username = userResults[0].username;


    const response = await axios.post('http://192.168.0.53:49295/', {
      text,
      text_language,
      model_name
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer'
    });

    // 生成文件名：username + model_name + 时间戳
    const fileName = `${username}_${model_name}_${Date.now()}.wav`;
    const filePath = path.join(AUDIO_DIR, fileName);


    fs.writeFileSync(filePath, response.data);


    const downloadLink = `http://127.0.0.1:5000/download/${fileName}`;


    res.json({ downloadLink });
  } catch (error) {
    console.error('生成语音失败:', error);
    res.status(500).json({ message: '生成语音失败' });
  }
});


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


    res.json({ text: response.data.choices[0].message.content });
  } catch (error) {
    console.error('调用 DeepSeek API 失败:', error.response?.data || error.message);
    res.status(500).json({ error: '调用 DeepSeek API 失败' });
  }
});




const PORT = 5000;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://127.0.0.1:${PORT}`);
});