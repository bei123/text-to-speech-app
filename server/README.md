# 文本转语音应用后端

这是一个高性能的文本转语音Web应用的后端服务，提供用户认证、语音生成、历史记录管理等功能。

## 目录结构

```
server/
├── config/             # 配置文件
│   ├── api.js          # API相关配置
│   ├── database.js     # 数据库配置
│   ├── redis.js        # Redis配置
│   └── queue.js        # 任务队列配置
├── controllers/        # 控制器
│   ├── authController.js
│   ├── speechController.js
│   └── userController.js
├── middlewares/        # 中间件
│   ├── auth.js         # 身份验证中间件
│   └── validators.js   # 数据验证中间件
├── models/             # 数据模型
│   └── init_db.sql     # 数据库初始化SQL
├── routes/             # 路由
│   ├── auth.js
│   ├── speech.js
│   └── user.js
├── services/           # 服务层
│   └── speechService.js
├── utils/              # 工具函数
│   ├── crypto.js       # 加密工具
│   └── logger.js       # 日志工具
├── app.js              # 应用配置
├── server.js           # 服务器入口
├── .env                # 环境变量
├── package.json        # 依赖配置
└── README.md           # 项目说明
```

## 功能特性

- **用户认证**: 完整的JWT认证系统，支持访问令牌和刷新令牌
- **文本转语音**: 集成多种语音合成模型，支持多语言
- **任务队列**: 使用Bull队列处理语音生成任务
- **历史记录**: 记录和管理用户的语音生成历史
- **安全性**: 数据加密、敏感信息保护、防XSS和CSRF
- **高性能**: 优化的代码结构，支持高并发

## 技术栈

- **Node.js**: 服务器运行环境
- **Express**: Web框架
- **MySQL**: 数据存储
- **Redis**: 缓存和队列
- **Bull**: 任务队列
- **JWT**: 身份验证
- **CryptoJS & bcrypt**: 数据加密

## 安装与运行

1. 克隆仓库
```bash
git clone https://github.com/yourusername/text-to-speech-app.git
```

2. 安装依赖
```bash
cd text-to-speech-app/server
npm install
```

3. 配置环境变量
```bash
cp .env.example .env
# 编辑.env文件设置你的环境变量
```

4. 初始化数据库
```bash
# 创建MySQL数据库，然后系统会自动运行初始化SQL
```

5. 启动服务器
```bash
npm run dev  # 开发模式
# 或
npm start    # 生产模式
```

## API文档

### 认证相关

- `POST /api/auth/register`: 用户注册
- `POST /api/auth/login`: 用户登录
- `POST /api/auth/refresh`: 刷新token
- `POST /api/auth/logout`: 用户登出

### 语音相关

- `POST /api/speech/generate`: 生成语音
- `GET /api/speech/models`: 获取可用模型列表
- `GET /api/speech/history`: 获取历史记录
- `GET /api/download/:filename`: 下载音频文件

### 用户相关

- `GET /api/user/profile`: 获取用户资料
- `PUT /api/user/profile`: 更新用户资料
- `PUT /api/user/password`: 修改密码

## 开发者指南

### 添加新路由

1. 在 `routes/` 目录下创建路由文件
2. 在 `controllers/` 目录下创建对应控制器
3. 在 `app.js` 中注册路由

### 添加新服务

1. 在 `services/` 目录下创建服务文件
2. 实现业务逻辑
3. 在控制器中引用服务

## 许可证

MIT 