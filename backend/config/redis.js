const redis = require('redis');
require('dotenv').config();

// Redis 客户端初始化
const redisClient = redis.createClient({
    url: process.env.REDIS_URL,
    database: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB) : 1
});

redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});

redisClient.connect();

module.exports = redisClient; 