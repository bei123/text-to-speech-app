const Bull = require('bull');

// Bull 任务队列初始化
const speechQueue = new Bull('speechGeneration', {
    redis: 'redis://localhost:6379'
});

module.exports = speechQueue; 