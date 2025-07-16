const Bull = require('bull');
require('dotenv').config();

// Bull 任务队列初始化
const speechQueue = new Bull('speechGeneration', {
    redis: {
        url: process.env.REDIS_URL,
        db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB) : 1
    }
});

module.exports = speechQueue; 