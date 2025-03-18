// src/app.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import { pool } from './utils/database.js';
import speechQueue from './jobs/speechQueueProcessor.js';
import FileStorage from './utils/storage.js';
import config from './config/index.js';
import routes from './routes/index.js';

// 初始化Express应用
const app = express();

// 基础中间件配置
app.use(helmet());
app.use(cors(config.cors));
app.use(morgan(config.morgan.format));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 数据库连接检查
const checkDatabase = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

// 存储系统初始化
const storage = new FileStorage();
setInterval(() => storage.cleanup(), config.storage.cleanupInterval);

// 主路由挂载
app.use('/api/v1', routes);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    redis: speechQueue.client.status === 'ready' ? 'connected' : 'disconnected',
    database: pool.pool._closed ? 'disconnected' : 'connected'
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.message);
  
  const statusCode = err.statusCode || 500;
  const response = {
    code: err.code || 'INTERNAL_ERROR',
    message: config.env === 'production' ? 'An error occurred' : err.message
  };

  if (config.env === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
});

// 服务启动流程
const startServer = async () => {
  await checkDatabase();
  
  const server = app.listen(config.port, () => {
    console.log(`🚀 Server running on port ${config.port} [${config.env}]`);
  });

  // 优雅关闭处理
  const shutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}, shutting down...`);
    
    await speechQueue.close();
    await pool.end();
    server.close(() => process.exit(0));
    
    setTimeout(() => {
      console.error('⚠️ Forcing shutdown');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

// 启动应用
startServer();