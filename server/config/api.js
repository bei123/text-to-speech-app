// API 相关配置

// 服务器配置
const serverConfig = {
    baseUrl: process.env.SERVER_BASE_URL || 'http://localhost:3000',
    port: process.env.PORT || 3000,
    apiPrefix: '/api'
};

// 认证相关配置
const authConfig = {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || '1h',
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d',
    saltRounds: 10
};

// 语音服务配置
const speechConfig = {
    apiUrl: process.env.SPEECH_API_URL || 'https://api.example.com/tts',
    apiKey: process.env.SPEECH_API_KEY || 'your-api-key',
    defaultVoice: 'neural-1',
    defaultLanguage: 'zh-CN',
    maxTextLength: 3000
};

// 聊天服务配置
const chatConfig = {
    apiUrl: process.env.CHAT_API_URL || 'https://api.example.com/chat',
    apiKey: process.env.CHAT_API_KEY || 'your-chat-api-key',
    maxMessageLength: 2000
};

// Redis 配置
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
    keyPrefix: 'tts:'
};

module.exports = {
    serverConfig,
    authConfig,
    speechConfig,
    chatConfig,
    redisConfig
}; 