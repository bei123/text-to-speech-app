// src/config/index.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 解决 __dirname 在 ES 模块中的问题
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量（根据NODE_ENV加载不同配置）
const envResult = dotenv.config({
  path: path.resolve(
    __dirname,
    `../../.env.${process.env.NODE_ENV || 'development'}`
  )
});

if (envResult.error) {
  console.error('⚠️ 环境变量加载失败:', envResult.error);
  process.exit(1);
}

export default {
  // 服务器基础配置
  server: {
    port: parseInt(process.env.PORT || 5000, 10),
    baseUrl: process.env.BASE_URL || 'http://aidudio.2000gallery.art:10000'
  },

  // 数据库配置
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'text_to_speech',
    password: process.env.DB_PASSWORD || 'KSrJpjNsCSfp8WRH',
    database: process.env.DB_NAME || 'text_to_speech',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || 10, 10),
    queueLimit: 0,
    timezone: '+08:00' // 设置为中国时区
  },

  // 认证相关配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_refresh_secret',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d'
  },

  // Redis 配置
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: {
      encryptionKey: parseInt(process.env.REDIS_ENCRYPTION_KEY_TTL || 300, 10), // 5分钟
      speechCache: parseInt(process.env.REDIS_SPEECH_CACHE_TTL || 3600, 10) // 1小时
    }
  },

  // 音频文件存储配置
  storage: {
    audioDir: process.env.AUDIO_DIR || path.join(__dirname, '../../audio_files'),
    maxFileSize: parseInt(process.env.MAX_AUDIO_FILE_SIZE || 10485760, 10) // 10MB
  },

  // 第三方服务配置
  thirdParty: {
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || 'sk-65061bf460e14ec283f1f0d287827ba4',
      apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      maxTokens: parseInt(process.env.DEEPSEEK_MAX_TOKENS || 500, 10)
    },
    
    ttsService: {
      endpoint: process.env.TTS_SERVICE_ENDPOINT || 'http://192.168.0.53:9646/',
      timeout: parseInt(process.env.TTS_SERVICE_TIMEOUT || 30000, 10) // 30秒
    }
  },

  // 安全配置
  security: {
    encryption: {
      algorithm: 'aes-256-cbc',
      keySize: 256 / 8 // 32字节
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 100 // 每个IP每15分钟100次请求
    }
  }
};

// 配置验证
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  警告：未设置JWT_SECRET环境变量，使用不安全默认值！');
}

if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === 'default_password') {
  console.warn('⚠️  警告：数据库使用默认密码，生产环境不安全！');
}