require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const https = require('https');
const helmet = require('helmet');

// 导入路由
const authRoutes = require('./routes/authRoutes');
const modelRoutes = require('./routes/modelRoutes');
const speechRoutes = require('./routes/speechRoutes');
const aiRoutes = require('./routes/aiRoutes');

// 导入队列服务
const { initQueueProcessor } = require('./services/queueService');

// 创建Express应用
const app = express();

// SSL证书配置
const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, '../ssl/private.key')),
    cert: fs.readFileSync(path.join(__dirname, '../ssl/certificate.crt'))
};

// 安全中间件设置
app.use(helmet()); // 添加安全头
app.use(cors({
    origin: [
        'https://aidudio.2000gallery.art',
        'https://www.aidudio.2000gallery.art',
        'http://aidudio.2000gallery.art',
        'http://www.aidudio.2000gallery.art',
        'http://aidudio.2000gallery.art:9866',
        'https://aidudio.2000gallery.art:9866',
        "https://tts.2000gallery.art",
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    exposedHeaders: ['Content-Range', 'X-Content-Range']
}));
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

// 启动HTTPS服务器
const PORT = process.env.PORT || 5000;
https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`HTTPS服务器运行在 https://backend.2000gallery.art:${PORT}`);
});