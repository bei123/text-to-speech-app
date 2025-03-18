import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import authRoutes from './routes/authRoutes.js'
import speechRoutes from './routes/speechRoutes.js'
import deepseekRoutes from './routes/deepseekRoutes.js'
import { redisClient } from './utils/redis.js'
import './jobs/speechQueueProcessor.js' // 初始化队列处理器

const app = express()

// 基础中间件
app.use(cors())
app.use(bodyParser.json())

// 路由注册
app.use('/api/auth', authRoutes)
app.use('/api/speech', speechRoutes)
app.use('/api/deepseek', deepseekRoutes)

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'UP',
    redis: redisClient.isOpen ? 'CONNECTED' : 'DISCONNECTED'
  })
})

// 统一错误处理
app.use((err, req, res, next) => {
  console.error('全局错误:', err)
  res.status(500).json({ 
    code: 'INTERNAL_ERROR',
    message: '服务器内部错误'
  })
})

export default app