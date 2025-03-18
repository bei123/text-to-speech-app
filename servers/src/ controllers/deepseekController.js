// src/controllers/deepseekController.js
import { validationResult } from 'express-validator';
import { redisClient } from '../utils/redis.js';
import DeepseekService from '../services/deepseekService.js';
import { pool } from '../utils/database.js';
import config from '../config/index.js';

export default class DeepseekController {
  /**
   * 处理标准聊天请求
   * @route POST /api/deepseek/chat
   * @param {string} prompt - 用户输入内容
   * @param {string} [systemMessage] - 系统角色设定
   */
  static async handleChatRequest(req, res) {
    try {
      // 参数校验
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          errors: errors.array()
        });
      }

      const { prompt, systemMessage } = req.body;
      const userId = req.user.id;

      // 敏感词过滤
      const sanitizedPrompt = DeepseekService.sanitizeInput(prompt);
      if (sanitizedPrompt.length === 0) {
        return res.status(400).json({
          code: 'INVALID_CONTENT',
          message: '输入包含非法内容'
        });
      }

      // 检查缓存
      const cacheKey = `deepseek:${userId}:${sanitizedPrompt}`;
      const cachedResponse = await redisClient.get(cacheKey);
      if (cachedResponse) {
        return res.json({
          code: 'CACHE_HIT',
          data: JSON.parse(cachedResponse)
        });
      }

      // 获取用户信息
      const [users] = await pool.query(
        'SELECT email, deepseek_api_key FROM users WHERE id = ?',
        [userId]
      );
      
      if (users.length === 0) {
        return res.status(404).json({
          code: 'USER_NOT_FOUND',
          message: '用户不存在'
        });
      }

      // 调用服务层
      const response = await DeepseekService.processRequest(
        sanitizedPrompt,
        systemMessage || config.deepseek.defaultSystemMessage,
        users[0].deepseek_api_key
      );

      // 缓存响应
      await redisClient.set(
        cacheKey,
        JSON.stringify(response),
        'EX',
        config.redis.ttl.chatCache
      );

      // 记录使用日志
      await pool.query(
        'INSERT INTO api_usage_logs (user_id, service_type, tokens_used) VALUES (?, ?, ?)',
        [userId, 'deepseek', response.usage.total_tokens]
      );

      res.json({
        code: 'REQUEST_SUCCESS',
        data: response
      });

    } catch (error) {
      console.error('[Deepseek控制器] 请求错误:', error);
      const statusCode = error.message.includes('API') ? 502 : 500;
      res.status(statusCode).json({
        code: 'SERVICE_UNAVAILABLE',
        message: error.message
      });
    }
  }

  /**
   * 处理流式聊天请求
   * @route POST /api/deepseek/stream
   * @param {string} prompt - 用户输入内容
   */
  static async handleStreamRequest(req, res) {
    try {
      const { prompt } = req.body;
      const userId = req.user.id;

      // 输入验证
      if (!prompt || prompt.length > 2000) {
        return res.status(400).json({
          code: 'INVALID_INPUT',
          message: '输入内容无效或过长'
        });
      }

      // 设置流式响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // 获取API密钥
      const [users] = await pool.query(
        'SELECT deepseek_api_key FROM users WHERE id = ?',
        [userId]
      );

      const stream = await DeepseekService.createStreamConnection(
        prompt,
        users[0].deepseek_api_key
      );

      // 处理流数据
      stream.on('data', (chunk) => {
        const payload = chunk.toString();
        res.write(`data: ${payload}\n\n`);
      });

      stream.on('end', () => {
        res.end();
      });

      stream.on('error', (err) => {
        console.error('流式传输错误:', err);
        res.write('event: error\ndata: ' + JSON.stringify({
          code: 'STREAM_ERROR',
          message: '实时通信中断'
        }) + '\n\n');
        res.end();
      });

    } catch (error) {
      console.error('[Deepseek控制器] 流式请求错误:', error);
      res.status(500).json({
        code: 'STREAM_FAILED',
        message: '流式连接初始化失败'
      });
    }
  }

  /**
   * 获取聊天历史
   * @route GET /api/deepseek/history
   * @param {number} [hours=24] - 查询时间范围（小时）
   */
  static async getChatHistory(req, res) {
    try {
      const userId = req.user.id;
      const hours = parseInt(req.query.hours) || 24;

      const [history] = await pool.query(
        `SELECT 
          request_time AS time,
          prompt,
          response,
          tokens_used AS tokens
        FROM api_usage_logs
        WHERE 
          user_id = ? AND 
          service_type = 'deepseek' AND 
          request_time > NOW() - INTERVAL ? HOUR
        ORDER BY request_time DESC
        LIMIT 100`,
        [userId, hours]
      );

      res.json({
        code: 'HISTORY_FETCHED',
        data: history
      });

    } catch (error) {
      console.error('[Deepseek控制器] 历史记录错误:', error);
      res.status(500).json({
        code: 'HISTORY_FAILED',
        message: '获取历史记录失败'
      });
    }
  }
}