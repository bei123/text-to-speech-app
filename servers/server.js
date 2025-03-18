// src/server.js
import app from './app.js';
import { pool } from './utils/database.js';
import speechQueue from './jobs/speechQueueProcessor.js';
import FileStorage from './utils/storage.js';
import config from './config/index.js';

// 初始化存储系统
const storage = new FileStorage({
  encrypt: config.storage.encryptFiles
});

// 数据库连接检查
const verifyDatabaseConnection = async () => {
  try {
    const [rows] = await pool.query('SELECT CONNECTION_ID() AS connectionId');
    console.log(`🔌 Database connected (Connection ID: ${rows[0].connectionId})`);
  } catch (error) {
    console.error('🛑 Failed to connect to database:', error.message);
    process.exit(1);
  }
};

// 队列健康检查
const checkQueueHealth = () => {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.error('⌛ Redis connection timeout');
      process.exit(1);
    }, 5000);

    speechQueue.once('ready', () => {
      clearTimeout(timer);
      console.log('🔔 Redis queue connected');
      resolve();
    });
  });
};

// 服务启动流程
const initializeServer = async () => {
  try {
    await verifyDatabaseConnection();
    await checkQueueHealth();

    // 启动定时任务
    setInterval(() => storage.cleanup(), config.storage.cleanupInterval);
    console.log('🔄 Storage cleanup scheduler initialized');

    // 启动HTTP服务
    const server = app.listen(config.port, () => {
      console.log(`🌐 Server listening on port ${config.port} [${config.env.toUpperCase()}]`);
    });

    // 优雅关闭处理
    const gracefulShutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}, initiating shutdown...`);
      
      try {
        // 关闭队列
        await speechQueue.close();
        console.log('⏹️  Speech queue closed');
        
        // 关闭数据库连接池
        await pool.end();
        console.log('🔒 Database connections released');
        
        // 关闭HTTP服务
        server.close(() => {
          console.log('🚪 HTTP server closed');
          process.exit(0);
        });

        // 强制退出保护
        setTimeout(() => {
          console.error('⏰ Shutdown timeout exceeded, forcing exit');
          process.exit(1);
        }, 7000);
      } catch (error) {
        console.error('🔥 Forced shutdown due to error:', error);
        process.exit(1);
      }
    };

    // 信号处理
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    process.exit(1);
  }
};

// 启动服务
initializeServer();