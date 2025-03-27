const Bull = require('bull');

// Bull 任务队列初始化
const speechQueue = new Bull('speechGeneration', {
    redis: {
        url: 'redis://localhost:6379',
        db: 1
    }
});

module.exports = speechQueue; 