const Bull = require('bull');

// 创建一个模拟的队列，用于开发环境
class MockQueue {
    constructor(name, options) {
        this.name = name;
        this.options = options;
        this.handlers = new Map();
        this.jobs = [];
        console.log(`使用模拟队列: ${name}（本地开发模式）`);
    }

    process(handler) {
        this.handler = handler;
        console.log(`注册队列处理器: ${this.name}`);
        return this;
    }

    async add(data) {
        const jobId = Date.now();
        const job = {
            id: jobId,
            data,
            finished: async () => {
                try {
                    // 直接处理任务，无需排队
                    console.log(`处理队列任务: ${this.name} #${jobId}`);
                    return await this.handler({ data });
                } catch (error) {
                    console.error(`队列任务处理失败: ${this.name} #${jobId}`, error);
                    throw error;
                }
            }
        };
        this.jobs.push(job);
        return job;
    }
}

// 尝试创建真实队列，如果失败则使用模拟队列
let speechQueue;

try {
    speechQueue = new Bull('speechGeneration', {
        redis: 'redis://localhost:6379',
        // 在Redis连接失败后立即切换到模拟模式
        settings: {
            retryStrategy: () => null
        }
    });

    // 添加一个健康检查
    speechQueue.client.on('error', () => {
        console.error('队列Redis连接失败，切换到模拟模式');
        speechQueue = new MockQueue('speechGeneration');
    });
} catch (error) {
    console.error('队列初始化失败，使用模拟模式:', error);
    speechQueue = new MockQueue('speechGeneration');
}

module.exports = speechQueue; 