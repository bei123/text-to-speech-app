// src/jobs/speechQueueProcessor.js
import Queue from 'bull';
import { pool } from '../utils/database.js';
import SpeechService from '../services/speechService.js';
import TTSGenerator from '../utils/ttsGenerator.js';
import FileStorage from '../utils/storage.js';
import config from '../config/index.js';
import cryptoUtils from '../utils/cryptoUtils.js';
import path from 'path';

// 初始化队列实例
const speechQueue = new Queue('speech-generation', {
  redis: config.redis,
  limiter: {
    max: config.queue.concurrency,
    duration: 1000
  }
});

// 初始化文件存储
const storage = new FileStorage({
  encrypt: config.storage.encryptFiles
});

// 核心任务处理逻辑
speechQueue.process(config.queue.concurrency, async (job) => {
  const { taskId, text, options, userId } = job.data;
  
  try {
    // 获取用户加密密钥
    const [users] = await pool.query(
      'SELECT encryption_key FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      throw new Error('USER_NOT_FOUND');
    }

    // 生成临时文件路径
    const tempFileName = `${taskId}.tmp`;
    const tempPath = path.join(config.storage.tempPath, tempFileName);

    // 更新任务状态为处理中
    await SpeechService.updateRequestStatus(taskId, 'processing');

    // 生成语音内容
    const ttsResult = await TTSGenerator.generate({
      text,
      voice: options.voice || 'default',
      speed: options.speed || 1.0,
      output: tempPath
    });

    // 读取生成的文件内容
    const fileBuffer = await fs.promises.readFile(tempPath);

    // 持久化存储文件
    const storageResult = await storage.saveFile(fileBuffer, {
      originalName: `${taskId}.${ttsResult.format}`,
      encryptionKey: users[0].encryption_key
    });

    // 更新任务元数据
    await SpeechService.updateRequestStatus(taskId, 'completed', {
      fileName: storageResult.fileName,
      duration: ttsResult.duration,
      fileSize: storageResult.size
    });

    // 清理临时文件
    await fs.promises.unlink(tempPath);

    return {
      success: true,
      storagePath: storageResult.storagePath
    };
  } catch (error) {
    // 更新失败状态
    await SpeechService.updateRequestStatus(taskId, 'failed', {
      error: error.message
    });

    // 清理残留文件
    if (tempPath) {
      await fs.promises.unlink(tempPath).catch(() => {});
    }

    throw error;
  }
});

// 队列事件监听器
speechQueue
  .on('completed', (job) => {
    console.log(`[${new Date().toISOString()}] Task ${job.id} completed`);
  })
  .on('failed', (job, err) => {
    console.error(`[${new Date().toISOString()}] Task ${job.id} failed:`, err.message);
  })
  .on('stalled', (job) => {
    console.warn(`[${new Date().toISOString()}] Task ${job.id} stalled`);
  });

// 清理历史任务
const cleanOldJobs = async () => {
  const jobs = await speechQueue.getJobs(['completed', 'failed']);
  const cutoff = Date.now() - config.queue.retentionPeriod;
  
  await Promise.all(jobs.map(async (job) => {
    if (job.finishedOn < cutoff) {
      await job.remove();
    }
  }));
};

// 定时清理任务
setInterval(cleanOldJobs, config.queue.cleanupInterval).unref();

export default speechQueue;