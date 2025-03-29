const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { fileURLToPath } = require('url');
const { dirname } = require('path');
const dotenv = require('dotenv');
const { getOSSClient } = require('./utils/ossUtils');

// 加载环境变量
dotenv.config();

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 创建 Express 应用
const app = express();

// 中间件配置
app.use(helmet({
    crossOriginResourcePolicy: { policy: "same-site" }
}));
app.use(cors({
    origin: ['https://tts.2000gallery.art', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// 路由配置
const speechRoutes = require('./routes/speechRoutes');
app.use('/api/speech', speechRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
});