// src/controllers/speechController.js
import path from 'path';
import fs from 'fs';
import { pool } from '../utils/database.js';
import { redisClient } from '../utils/redis.js';
import { speechQueue } from '../queues/speechQueue.js';
import config from '../config/index.js';

export default class SpeechController {
  /**
   * 生成语音请求
   * @route POST /api/speech/generate
   * @param {string} text - 待合成文本
   * @param {string} text_language - 文本语言
   * @param {string} model_name - 模型名称
   */
  static async generateSpeech(req, res) {
    try {
      const { text, text_language, model_name } = req.body;
      const userId = req.user.id;

      // 参数校验
      if (!text || !text_language || !model_name) {
        return res.status(400).json({
          code: 'MISSING_PARAMETERS',
          message: '缺少必要参数'
        });
      }

      // 生成缓存键
      const cacheKey = `speech:${userId}:${text}:${text_language}:${model_name}`;

      // 检查缓存命中
      const cachedLink = await redisClient.get(cacheKey);
      if (cachedLink) {
        return res.json({ 
          code: 'CACHE_HIT', 
          downloadLink: cachedLink 
        });
      }

      // 获取用户信息
      const [userResult] = await pool.query(
        'SELECT username, email FROM users WHERE id = ?',
        [userId]
      );
      
      if (userResult.length === 0) {
        return res.status(404).json({ 
          code: 'USER_NOT_FOUND', 
          message: '用户不存在' 
        });
      }

      const { username, email } = userResult[0];

      // 创建初始请求记录
      const [requestResult] = await pool.query(
        `INSERT INTO audio_requests 
          (user_id, user_email, text, model_name, text_language, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, email, text, model_name, text_language, 'pending']
      );

      // 添加队列任务
      const job = await speechQueue.add({
        text,
        text_language,
        model_name,
        userId,
        userEmail: email,
        username,
        requestId: requestResult.insertId
      });

      // 更新任务ID
      await pool.query(
        'UPDATE audio_requests SET job_id = ? WHERE id = ?',
        [job.id, requestResult.insertId]
      );

      // 等待任务完成
      const downloadLink = await job.finished();

      // 设置缓存
      await redisClient.set(
        cacheKey,
        downloadLink,
        'EX', // 设置过期时间
        config.redis.ttl.speechCache
      );

      res.json({ 
        code: 'REQUEST_ACCEPTED', 
        downloadLink 
      });

    } catch (error) {
      console.error('[语音控制器] 生成请求错误:', error);
      res.status(500).json({ 
        code: 'GENERATION_FAILED', 
        message: '语音生成失败' 
      });
    }
  }

  /**
   * 获取历史记录
   * @route GET /api/speech/history
   * @param {string} keyword - 搜索关键词
   * @param {number} page - 页码
   * @param {number} itemsPerPage - 每页数量
   */
  static async getHistory(req, res) {
    try {
      const userId = req.user.id;
      const { keyword, page = 1, itemsPerPage = 10 } = req.query;
      const offset = (page - 1) * itemsPerPage;

      // 构建基础查询
      let baseQuery = `
        SELECT 
          ar.id, 
          ar.text, 
          m.label AS model_name,
          ar.text_language, 
          ar.created_at AS createdAt, 
          ar.status,
          CONCAT('${config.server.baseUrl}/download/', af.file_name) AS audioUrl
        FROM audio_requests ar
        LEFT JOIN audio_files af ON ar.id = af.request_id
        LEFT JOIN models m ON ar.model_name = m.value
        WHERE ar.user_id = ?
      `;

      const queryParams = [userId];
      
      // 添加关键词过滤
      if (keyword?.trim()) {
        baseQuery += ' AND ar.text LIKE ?';
        queryParams.push(`%${keyword.trim()}%`);
      }

      // 分页数据查询
      const dataQuery = `${baseQuery} ORDER BY ar.created_at DESC LIMIT ? OFFSET ?`;
      const [records] = await pool.query(dataQuery, [
        ...queryParams,
        parseInt(itemsPerPage),
        offset
      ]);

      // 总数查询
      const countQuery = `SELECT COUNT(*) AS total FROM (${baseQuery}) AS filtered`;
      const [totalResult] = await pool.query(countQuery, queryParams);

      res.json({
        code: 'HISTORY_FETCHED',
        data: records,
        pagination: {
          total: totalResult[0].total,
          page: parseInt(page),
          itemsPerPage: parseInt(itemsPerPage)
        }
      });

    } catch (error) {
      console.error('[语音控制器] 历史记录错误:', error);
      res.status(500).json({ 
        code: 'HISTORY_FAILED', 
        message: '获取历史记录失败' 
      });
    }
  }

  /**
   * 下载音频文件
   * @route GET /api/speech/download/:fileName
   * @param {string} fileName - 文件名
   */
  static downloadFile(req, res) {
    try {
      const fileName = req.params.fileName;
      const filePath = path.join(config.storage.audioDir, fileName);

      // 验证文件名格式
      if (!/^[\w-]+\.wav$/.test(fileName)) {
        return res.status(400).json({ 
          code: 'INVALID_FILENAME', 
          message: '无效文件名格式' 
        });
      }

      // 检查文件存在性
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ 
          code: 'FILE_NOT_FOUND', 
          message: '音频文件不存在' 
        });
      }

      // 设置下载头
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

      // 流式传输文件
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

    } catch (error) {
      console.error('[语音控制器] 下载错误:', error);
      res.status(500).json({ 
        code: 'DOWNLOAD_FAILED', 
        message: '文件下载失败' 
      });
    }
  }
}