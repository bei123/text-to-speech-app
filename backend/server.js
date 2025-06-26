const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// 调试信息
console.log('环境变量加载状态:', {
    OSS_ACCESS_KEY_ID: process.env.OSS_ACCESS_KEY_ID ? '已设置' : '未设置',
    OSS_ACCESS_KEY_SECRET: process.env.OSS_ACCESS_KEY_SECRET ? '已设置' : '未设置',
    OSS_BUCKET: process.env.OSS_BUCKET ? '已设置' : '未设置',
    OSS_REGION: process.env.OSS_REGION ? '已设置' : '未设置'
});

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const https = require('https');
const helmet = require('helmet');
const { testConnection, syncDatabase } = require('./config/database');

// 导入路由
const authRoutes = require('./routes/authRoutes');
const modelRoutes = require('./routes/modelRoutes');
const speechRoutes = require('./routes/speechRoutes');
const aiRoutes = require('./routes/aiRoutes');
const qqMusicRoutes = require('./routes/qqMusicRoutes');

// 导入队列服务
const { initQueueProcessor } = require('./services/queueService');

// 创建Express应用
const app = express();

// SSL证书配置
const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, '../ssl/backend.2000gallery.art.key')),
    cert: fs.readFileSync(path.join(__dirname, '../ssl/backend.2000gallery.art.pem'))
};

// 安全中间件设置
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "https:", "wss:", "ws:"],
            fontSrc: ["'self'", "data:", "https:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'", "https:", "blob:"],
            frameSrc: ["'none'"],
            sandbox: ["allow-forms", "allow-scripts", "allow-same-origin"]
        }
    },
    crossOriginResourcePolicy: { policy: "same-site" },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin" }
}));

app.use(cors({
    origin: ['https://tts.2000gallery.art', 'http://localhost:8080'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-QR-Identifier',
        'X-Requested-With'
    ],
    credentials: true
}));

// 添加自定义 CORS 中间件
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin === 'https://tts.2000gallery.art' || origin === 'http://localhost:5173') {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        res.header('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type, Content-Length');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Max-Age', '86400');
    }

    // 处理 OPTIONS 请求
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(bodyParser.json({ limit: '10mb' })); // 限制请求体大小
app.use(bodyParser.urlencoded({ extended: true }));

// 初始化队列处理器
initQueueProcessor();

// 音频文件保存路径
const AUDIO_DIR = path.join(__dirname, '../audio_files');
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR);
}

// 路由设置
app.use('/', authRoutes);
app.use('/models', modelRoutes);
app.use('/', speechRoutes);
app.use('/', aiRoutes);
app.use('/qqmusic', qqMusicRoutes);

// 初始化数据库
const initializeDatabase = async () => {
  await testConnection();
  await syncDatabase();
};

// 启动HTTPS服务器
const PORT = process.env.PORT || 5000;
https.createServer(sslOptions, app).listen(PORT, async () => {
    console.log(`HTTPS服务器运行在 https://backend.2000gallery.art:${PORT}`);
    await initializeDatabase();
});