const redis = require('redis');

// 创建一个模拟的Redis客户端，用于开发环境
class MockRedisClient {
    constructor() {
        this.storage = new Map();
        console.log('使用模拟Redis客户端（本地开发模式）');
    }

    async connect() {
        return true;
    }

    async set(key, value, option, time) {
        if (option === 'EX') {
            // 设置带过期时间的键值
            this.storage.set(key, value);
            // 在实际实现中可以添加过期时间处理
            setTimeout(() => {
                this.storage.delete(key);
            }, time * 1000);
        } else {
            this.storage.set(key, value);
        }
        return 'OK';
    }

    async get(key) {
        return this.storage.get(key) || null;
    }

    async del(key) {
        this.storage.delete(key);
        return 1;
    }

    on(event, callback) {
        // 模拟事件监听
        if (event === 'error') {
            // 不触发错误事件
        }
    }
}

let redisClient;

try {
    // 尝试连接真实的Redis服务器
    redisClient = redis.createClient({
        url: 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => {
        console.error('Redis连接错误，切换到模拟模式:', err);
        redisClient = new MockRedisClient();
    });

    // 尝试连接
    redisClient.connect().catch(err => {
        console.error('Redis连接失败，切换到模拟模式:', err);
        redisClient = new MockRedisClient();
    });
} catch (error) {
    console.error('Redis初始化错误，使用模拟模式:', error);
    redisClient = new MockRedisClient();
}

module.exports = redisClient; 