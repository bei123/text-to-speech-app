const redis = require('redis');

// Redis 客户端初始化
const redisClient = redis.createClient({
    url: 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});

redisClient.connect();

module.exports = redisClient; 