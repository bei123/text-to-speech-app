// src/services/speechService.js
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../utils/database.js';
import FileStorage from '../utils/fileStorage.js';
import config from '../config/index.js';
import speechQueue from '../queues/speechQueue.js';

// 文件存储初始化
const storage = new FileStorage({
  basePath: config.storage.audioPath,
  tempTTL: config.storage.tempRetention
});

export default class SpeechService {
  /**
   * 创建语音生成请求（带事务处理）
   * @param {number} userId - 用户ID
   * @param {string} text - 待转换文本
   * @param {object} options - 生成选项
   * @returns {Promise<string>} 任务ID
   */
  static async createSpeechRequest(userId, text, options = {}) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 生成唯一任务ID
      const taskId = uuidv4();
      const tempFileName = `${taskId}.tmp`;

      // 写入数据库记录
      const [result] = await connection.query(
        `INSERT INTO speech_requests 
        (user_id, task_id, status, text, options) 
        VALUES (?, ?, 'pending', ?, ?)`,
        [userId, taskId, text, JSON.stringify(options)]
      );

      // 加入处理队列
      await speechQueue.add({
        taskId,
        text,
        options,
        tempFilePath: storage.getTempPath(tempFileName)
      });

      await connection.commit();
      return taskId;
    } catch (error) {
      await connection.rollback();
      throw new Error('REQUEST_CREATION_FAILED');
    } finally {
      connection.release();
    }
  }

  /**
   * 获取用户语音生成历史（分页查询）
   * @param {number} userId - 用户ID
   * @param {number} page - 页码
   * @param {number} pageSize - 每页数量
   */
  static async getSpeechHistory(userId, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    
    try {
      const [requests] = await pool.query(
        `SELECT task_id, status, text, created_at, completed_at 
        FROM speech_requests 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?`,
        [userId, pageSize, offset]
      );

      const [count] = await pool.query(
        `SELECT COUNT(*) AS total 
        FROM speech_requests 
        WHERE user_id = ?`,
        [userId]
      );

      return {
        data: requests.map(r => ({
          ...r,
          text: r.text.substring(0, 100) // 返回摘要文本
        })),
        pagination: {
          page,
          pageSize,
          total: count[0].total,
          totalPages: Math.ceil(count[0].total / pageSize)
        }
      };
    } catch (error) {
      throw new Error('HISTORY_FETCH_FAILED');
    }
  }

  /**
   * 获取音频文件元数据
   * @param {string} fileName - 文件名（带扩展名）
   */
  static async getAudioFile(fileName) {
    try {
      const [files] = await pool.query(
        `SELECT s.*, u.encryption_key 
        FROM speech_files s
        JOIN users u ON s.user_id = u.id
        WHERE s.file_name = ?`,
        [fileName]
      );

      if (files.length === 0) return null;

      const fileInfo = files[0];
      return {
        path: storage.getFullPath(fileName),
        mimeType: fileInfo.mime_type,
        encryptionKey: fileInfo.encryption_key
      };
    } catch (error) {
      throw new Error('FILE_FETCH_FAILED');
    }
  }

  /**
   * 清理过期临时文件（定时任务）
   */
  static async cleanupTempFiles() {
    try {
      const expiredFiles = await storage.findExpiredTempFiles();
      const deletePromises = expiredFiles.map(f => 
        storage.deleteFile(f).catch(() => null)
      );

      // 限制并发数量
      const results = await Promise.all(
        deletePromises.slice(0, config.storage.maxCleanupConcurrency)
      );

      return {
        total: expiredFiles.length,
        deleted: results.filter(r => r).length
      };
    } catch (error) {
      throw new Error('CLEANUP_FAILED');
    }
  }

  /**
   * 更新语音请求状态（内部使用）
   * @param {string} taskId - 任务ID
   * @param {string} status - 新状态
   * @param {object} result - 处理结果
   */
  static async updateRequestStatus(taskId, status, result = null) {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        `UPDATE speech_requests 
        SET 
          status = ?,
          completed_at = CURRENT_TIMESTAMP,
          result = ?
        WHERE task_id = ?`,
        [status, JSON.stringify(result), taskId]
      );
    } catch (error) {
      throw new Error('STATUS_UPDATE_FAILED');
    } finally {
      connection.release();
    }
  }
}