const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

// 导入路由
const authRoutes = require('./routes/authRoutes');
const modelRoutes = require('./routes/modelRoutes');
const speechRoutes = require('./routes/speechRoutes');
const aiRoutes = require('./routes/aiRoutes');

// 导入队列服务
const { initQueueProcessor } = require('./services/queueService');

// 创建Express应用
const app = express();

// 中间件设置
app.use(cors());
app.use(bodyParser.json());

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

// 启动服务器
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://aidudio.2000gallery.art:${PORT}`);
}); 