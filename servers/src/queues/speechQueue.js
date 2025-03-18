// src/queues/speechQueue.js
import Queue from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../utils/database.js';
import SpeechService from '../services/speechService.js';
import TTSGenerator from '../utils/ttsGenerator.js';
import config from '../config/index.js';

// 创建队列实例
const speechQueue = new Queue('speech-generation', {
  redis: config.redis,
  limiter: {
    max: config.queue.concurrency,
    duration: 1000
  }
});

// 进程任务处理
speechQueue.process(config.queue.concurrency, async (job) => {
  const { taskId, text, options, tempFilePath } = job.data;
  
  try {
    // 生成语音文件
    const result = await TTSGenerator.generate({
      text,
      voice: options.voice || 'default',
      speed: options.speed || 1.0,
      output: tempFilePath
    });

    // 生成最终文件名
    const finalFileName = `${uuidv4()}.${result.format}`;
    
    // 永久存储文件
    await SpeechService.updateRequestStatus(taskId, 'completed', {
      fileName: finalFileName,
      duration: result.duration
    });

    return { success: true, fileName: finalFileName };
  } catch (error) {
    await SpeechService.updateRequestStatus(taskId, 'failed', {
      error: error.message
    });
    throw error;
  }
});

// 队列事件监听
speechQueue
  .on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  })
  .on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err.message);
  })
  .on('waiting', (jobId) => {
    console.log(`Job ${jobId} waiting`);
  });

// 清理旧任务
const cleanOldJobs = async () => {
  const jobs = await speechQueue.getJobs(['completed', 'failed']);
  const cutoff = Date.now() - config.queue.retentionPeriod;
  
  jobs.forEach(async (job) => {
    if (job.finishedOn < cutoff) {
      await job.remove();
    }
  });
};

// 定时清理
setInterval(cleanOldJobs, config.queue.cleanupInterval);

export default speechQueue;