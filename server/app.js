const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

// 导入路由
const authRoutes = require('./routes/auth');
const speechRoutes = require('./routes/speech');
const historyRoutes = require('./routes/history');
const userRoutes = require('./routes/user');
const downloadRoutes = require('./routes/download');
const encryptionRoutes = require('./routes/encryption');

// 创建 Express 应用
const app = express();

// 音频文件目录
const AUDIO_DIR = path.join(__dirname, '../audio_files');
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR);
}

// 中间件
app.use(helmet()); // 安全头
app.use(cors()); // 跨域支持
app.use(morgan('dev')); // 日志
app.use(express.json()); // JSON 解析
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Cookie 解析

// 静态文件服务
app.use('/audio_files', express.static(AUDIO_DIR));

// 注册路由
app.use('/api/auth', authRoutes);
app.use('/api/speech', speechRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/user', userRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/encryption', encryptionRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: err.message
    });
});

module.exports = app; 