# 语音合成应用 (Text-to-Speech App)

---

**春节主题**：当前启用春节年味样式（中国红、金色、马年大吉等文案）。节后恢复平日样式：在 `src/constants/constants.js` 中将 `SPRING_FESTIVAL_THEME` 改为 `false` 后重新构建即可；生肖年文案由 `SPRING_FESTIVAL_ZODIAC`（如 `'马年'`）统一配置。

---

**体验地址**：[https://tts.2000gallery.art/#/](https://tts.2000gallery.art/#/)

- 账号：`tiyan`
- 密码：`Tiyan@123`

---

## 项目介绍

这是一个基于Vue.js和Express.js开发的全栈语音合成应用，支持多种语音模型和多语言文本转语音功能。用户可以使用AI辅助生成文本，选择不同的语音模型，并将文本转换为高质量的语音文件。

本项目后端核心功能基于 [GPT-SoVITS](https://github.com/RVC-Boss/GPT-SoVITS) 的API实现，这是一个强大的少样本声音克隆框架，仅需1分钟的语音数据即可训练出高质量的TTS模型。本项目使用的是修改版API，地址：[https://github.com/bei123/GPT-SoVITS/blob/apiV3/apiV3.py](https://github.com/bei123/GPT-SoVITS/blob/apiV3/apiV3.py)。

## 主要功能

- **用户认证**：安全的用户注册和登录系统，使用JWT进行身份验证
- **多语音模型支持**：集成多种语音合成模型，提供不同风格的语音效果
- **AI文本生成**：通过DeepSeek API支持AI辅助文本创作
- **历史记录管理**：保存和管理用户生成的所有语音文件
- **全链路数据加密**：使用CryptoJS实现数据传输加密，保护用户隐私
- **少样本声音克隆**：基于GPT-SoVITS技术，仅需少量语音样本即可克隆指定声音
- **自定义音色**：上传参考音频文件，使用 v2ProPlus 模型生成自定义音色语音，支持保存和管理音色预设
- **音色圈子**：社区功能，用户可以分享自己的音色预设，浏览和使用其他用户分享的优质预设，支持使用次数统计

## 技术架构

### 前端

- **框架**：Vue.js 3
- **状态管理**：Vuex
- **UI组件**：Element Plus
- **HTTP客户端**：Axios
- **路由**：Vue Router

### 后端

- **服务器**：Express.js
- **数据库**：MySQL
- **缓存**：Redis
- **队列**：Bull
- **认证**：JWT (JSON Web Tokens)
- **语音合成**：修改版 GPT-SoVITS API

## GPT-SoVITS 集成

本项目后端集成了修改版的 GPT-SoVITS API，实现了高质量的文本到语音转换功能：

- 支持中文、英文、日语、韩语和粤语多语言文本转语音
- 少样本语音克隆，仅需1分钟的语音样本即可训练模型
- 丰富的情感控制和韵律调整
- 高质量音频输出

### GPT-SoVITS 特性

- 基于大规模预训练模型
- 结合了GPT和SoVITS的优势
- 提供了丰富的音色选择
- 支持多种语言和表达方式

## 自定义音色功能

自定义音色功能允许用户上传参考音频文件，使用 v2ProPlus 模型生成具有特定音色的语音。该功能提供了完整的预设管理系统，让用户可以保存、管理和快速使用音色配置。

### 功能特性

- **参考音频上传**：支持上传 3-10 秒的参考音频文件（WAV/MP3/M4A/AAC/OGG/FLAC 格式，最大 50MB）
- **自动格式转换**：非 WAV 格式的音频文件会自动转换为 WAV 格式
- **音频时长验证**：自动检查音频时长是否符合要求（3-10秒）
- **提示文本配置**：需要提供与参考音频内容完全一致的提示文本
- **多语言支持**：支持中文、英语、粤语、日语等多种提示语言
- **预设管理**：可以保存当前配置为预设，包括参考音频URL、提示文本和提示语言
- **快速切换**：支持在已保存的预设之间快速切换，无需重复配置
- **外部预设支持**：可以从音色圈子直接使用其他用户分享的预设

### 使用流程

1. **手动配置模式**：
   - 上传参考音频文件
   - 输入与音频内容一致的提示文本
   - 选择提示语言
   - 输入要生成的文本
   - 点击"生成语音"按钮

2. **预设模式**：
   - 从"快速使用预设"下拉框选择已保存的预设
   - 或从音色圈子选择其他用户分享的预设
   - 系统自动填充参考音频、提示文本和提示语言
   - 输入要生成的文本
   - 点击"生成语音"按钮

3. **保存预设**：
   - 完成音色配置后，点击"保存当前配置"按钮
   - 输入预设名称
   - 预设将保存到个人预设列表中

## 音色圈子功能

音色圈子是一个社区功能，允许用户分享自己的音色预设，并浏览、使用其他用户分享的优质预设。

### 功能特性

- **预设分享**：用户可以将自己保存的预设分享到社区
- **预设浏览**：浏览所有用户分享的公开预设
- **预设信息**：显示预设名称、作者、提示语言、更新时间、使用次数等信息
- **一键使用**：点击"使用此预设"按钮，自动跳转到自定义音色页面并加载预设
- **使用统计**：自动统计每个预设的使用次数，帮助用户发现热门预设
- **分页浏览**：支持分页浏览，每页显示 20 个预设

### 使用流程

1. **分享预设**：
   - 在自定义音色页面保存预设后
   - 在预设管理区域找到该预设
   - 点击"分享"按钮，将预设分享到音色圈子

2. **使用他人预设**：
   - 进入音色圈子页面
   - 浏览预设列表
   - 点击"使用此预设"按钮
   - 自动跳转到自定义音色页面并加载预设配置

3. **取消分享**：
   - 在预设管理区域找到已分享的预设
   - 点击"已分享"按钮，取消分享

### 预设数据结构

每个预设包含以下信息：
- **预设ID**：唯一标识符
- **预设名称**：用户自定义的名称
- **参考音频URL**：存储在OSS上的音频文件地址
- **提示文本**：与参考音频内容一致的文本
- **提示语言**：提示文本的语言代码
- **作者信息**：预设创建者的用户名
- **使用次数**：预设被使用的总次数
- **更新时间**：预设最后更新的时间

### API 部署说明

本项目使用的是修改版 GPT-SoVITS API：
- 修改版API源码：[https://github.com/bei123/GPT-SoVITS/blob/apiV3/apiV3.py](https://github.com/bei123/GPT-SoVITS/blob/apiV3/apiV3.py)
- 配置文件：[https://github.com/bei123/GPT-SoVITS/blob/apiV3/config.py](https://github.com/bei123/GPT-SoVITS/blob/apiV3/config.py)
- 原始项目地址：[https://github.com/RVC-Boss/GPT-SoVITS](https://github.com/RVC-Boss/GPT-SoVITS)

API修改版相比原版增加了更多功能和优化，提供了更稳定的接口服务。本项目使用的API端点配置位于 `backend/services/queueService.js`，若需修改API地址或参数，请编辑该文件。

## 后端 API 端点

### 预设相关 API

应用提供了完整的预设管理 API，支持自定义音色和音色圈子功能：

- **保存预设**：`POST /presets/save` - 保存当前音色配置为预设（需要认证）
- **获取预设列表**：`GET /presets/list` - 获取当前用户的所有预设（需要认证）
- **获取公开预设**：`GET /presets/public` - 获取所有用户分享的公开预设列表（支持分页）
- **增加使用次数**：`POST /presets/:id/use` - 增加预设的使用次数统计
- **分享/取消分享**：`PUT /presets/:id/share` - 切换预设的分享状态（需要认证）
- **删除预设**：`DELETE /presets/:id` - 删除指定的预设（需要认证）

### 语音生成 API

- **标准语音生成**：`POST /generate-speech` - 使用预设模型生成语音（需要认证）
- **自定义音色生成**：`POST /v2proplus` - 使用参考音频生成自定义音色语音（需要认证）
- **获取历史记录**：`GET /history` - 获取用户的语音生成历史记录（需要认证）

所有 API 请求都支持加密传输，使用 CryptoJS 进行端到端加密保护。

## 安全特性

应用实现了全面的安全保护措施：

- **端到端加密**：所有敏感数据（包括用户名、密码、请求参数）在传输过程中都经过加密
- **动态密钥生成**：每次请求生成新的加密密钥，提高安全性
- **令牌自动刷新**：JWT令牌过期自动刷新机制
- **密码安全存储**：使用bcrypt进行密码哈希存储

## 环境要求

- **Node.js**: 14.0.0 或更高版本
- **MySQL**: 5.7 或更高版本
- **Redis**: 6.0 或更高版本
- **Python**: 3.10 或更高版本 (用于GPT-SoVITS API)
- **操作系统**: Linux, macOS, 或 Windows
- **磁盘空间**: 至少 10GB 空闲空间 (包括模型文件)
- **内存**: 最少 8GB RAM (推荐 16GB 或更多)
- **GPU**: NVIDIA显卡，最低4GB显存 (用于GPT-SoVITS模型推理)

## 详细部署指南

### 1. 基础环境准备

#### 1.1 安装 Node.js
```bash
# 使用 nvm 安装 Node.js (推荐)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
nvm install 14
nvm use 14

# 验证安装
node -v  # 应显示 v14.x.x 或更高版本
npm -v   # 应显示 6.x.x 或更高版本
```

#### 1.2 安装和配置 MySQL
```bash
# Debian/Ubuntu 系统
sudo apt update
sudo apt install mysql-server

# 启动 MySQL 服务
sudo systemctl start mysql
sudo systemctl enable mysql

# 安全配置
sudo mysql_secure_installation
```

创建数据库和用户:
```sql
CREATE DATABASE text_to_speech;
CREATE USER 'text_to_speech'@'localhost' IDENTIFIED BY 'YourStrongPassword';
GRANT ALL PRIVILEGES ON text_to_speech.* TO 'text_to_speech'@'localhost';
FLUSH PRIVILEGES;
```

#### 1.3 安装和配置 Redis
```bash
# Debian/Ubuntu 系统
sudo apt update
sudo apt install redis-server

# 启动 Redis 服务
sudo systemctl start redis
sudo systemctl enable redis

# 验证 Redis 安装
redis-cli ping  # 应返回 PONG
```

#### 1.4 安装 Python 环境 (用于 GPT-SoVITS)
```bash
# 安装 Python 3.10
sudo apt update
sudo apt install python3.10 python3.10-venv python3-pip

# 验证安装
python3.10 --version  # 应显示 Python 3.10.x
```

### 2. 项目部署

#### 2.1 克隆项目仓库
```bash
git clone <repository-url>
cd text-to-speech-app
```

#### 2.2 前端部署
```bash
# 安装依赖
npm install

# 开发模式启动
npm run serve

# 构建生产版本
npm run build
```

如果要部署到生产环境，可以将`dist`目录下的内容部署到 Nginx 或其他 Web 服务器。

#### 2.3 后端部署

##### 2.3.1 配置环境变量
创建 `.env` 文件在项目根目录下:
```
# 服务器配置
PORT=5000
NODE_ENV=production

# 数据库配置
DB_HOST=localhost
DB_USER=text_to_speech
DB_PASSWORD=YourStrongPassword
DB_NAME=text_to_speech

# Redis 配置
REDIS_URL=redis://localhost:6379

# JWT 密钥 (请使用随机生成的强密钥)
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# GPT-SoVITS API 配置
TTS_API_URL=http://192.168.0.53:9870/

# DeepSeek API 配置
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_API_URL=https://api.deepseek.com/chat/completions
```

##### 2.3.2 修改配置文件

1. 修改 `backend/config/db.js` 中的数据库连接信息:
```javascript
const mysql = require('mysql2/promise');
require('dotenv').config();

// 数据库连接池
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'text_to_speech',
    password: process.env.DB_PASSWORD || 'YourStrongPassword',
    database: process.env.DB_NAME || 'text_to_speech',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

module.exports = pool;
```

2. 修改 `backend/config/redis.js` 中的 Redis 连接信息:
```javascript
const redis = require('redis');
require('dotenv').config();

// Redis 客户端初始化
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});

redisClient.connect();

module.exports = redisClient;
```

##### 2.3.3 创建数据库表

在 MySQL 中执行以下 SQL 脚本初始化数据库表结构:

```sql
-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 语音模型表
CREATE TABLE IF NOT EXISTS models (
    id INT AUTO_INCREMENT PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    series VARCHAR(100) DEFAULT '其他',
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 语音请求表
CREATE TABLE IF NOT EXISTS audio_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_email VARCHAR(100) NOT NULL,
    text TEXT NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    text_language VARCHAR(50) NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL,
    job_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 音频文件表
CREATE TABLE IF NOT EXISTS audio_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES audio_requests(id)
);

-- 用户登录日志表
CREATE TABLE IF NOT EXISTS user_login_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_agent VARCHAR(255),
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 音色预设表（自定义音色功能）
CREATE TABLE IF NOT EXISTS voice_presets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    ref_audio_url VARCHAR(500) NOT NULL,
    prompt_text TEXT NOT NULL,
    prompt_language VARCHAR(50) NOT NULL,
    is_shared TINYINT(1) DEFAULT 0,
    use_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_shared (is_shared)
);

-- 添加一些默认的语音模型
INSERT INTO models (value, label, series, avatar_url) VALUES
('model1', '男声-标准普通话', '标准系列', '/avatars/male1.png'),
('model2', '女声-标准普通话', '标准系列', '/avatars/female1.png'),
('model3', '男声-英语', '英语系列', '/avatars/male2.png'),
('model4', '女声-英语', '英语系列', '/avatars/female2.png');
```

##### 2.3.4 安装后端依赖并启动服务
```bash
# 安装依赖
npm install

# 直接启动
node server.js

# 使用 PM2 管理后端服务（推荐生产环境使用）
npm install -g pm2
pm2 start server.js --name "text-to-speech-backend"
pm2 startup  # 设置开机自启
pm2 save     # 保存当前进程列表
```

### 3. GPT-SoVITS API部署

#### 3.1 安装修改版 GPT-SoVITS
1. 克隆修改版仓库:
```bash
git clone https://github.com/bei123/GPT-SoVITS.git
cd GPT-SoVITS
```

2. 安装依赖:
```bash
pip install -r requirements.txt
```

3. 下载基础模型文件，放置到对应目录。

#### 3.2 配置模型文件夹结构

GPT-SoVITS API 需要特定的文件夹结构来存放模型文件。请按照以下步骤创建模型目录：

1. 在 GPT-SoVITS 根目录下创建 `api_Model` 文件夹：
```bash
mkdir -p api_Model
```

2. 在 `api_Model` 文件夹中，为每个角色/模型创建一个独立文件夹（使用角色名命名）：
```bash
mkdir -p api_Model/男声-标准普通话
mkdir -p api_Model/女声-标准普通话
# 根据需要添加更多角色文件夹
```

3. 每个角色文件夹内需要包含以下文件：
   - `*.pth` - SoVITS 模型文件
   - `*.ckpt` - GPT 模型文件
   - 参考音频文件 - 名称必须与 `config.py` 中 `modelToPromptText` 定义的值一致

文件夹结构示例：
```
GPT-SoVITS/
|-- apiV3.py
|-- config.py
|-- api_Model/
    |-- 男声-标准普通话/
        |-- model.pth            # SoVITS 模型文件
        |-- model.ckpt           # GPT 模型文件
        |-- 你好，我是配音员.wav   # 参考音频，文件名必须与配置中的prompt_text一致
    |-- 女声-标准普通话/
        |-- model.pth
        |-- model.ckpt
        |-- 你好，我是配音员.wav
```

> **重要提示**：参考音频文件名必须与 `config.py` 中为该模型配置的 `prompt_text` 值完全一致，否则系统将无法找到正确的参考音频。

#### 3.3 配置 config.py

GPT-SoVITS API 使用 `config.py` 文件进行配置，需要修改以下关键参数：

```python
# 模型配置示例
self.modelToPromptText = {
    "男声-标准普通话": "你好，我是配音员",
    "女声-标准普通话": "你好，我是配音员"
    # 添加更多模型及其对应的prompt文本
}

self.modelToPromptLanguage = {
    "男声-标准普通话": "zh",
    "女声-标准普通话": "zh"
    # 添加更多模型及其对应的语言代码
}

# 运行设备配置
infer_device = "cuda"  # 使用GPU，如无GPU可设为"cpu"

# API端口配置
api_port = 9870
```

**注意事项**：
1. `modelToPromptText` 中的值必须与 `api_Model/[角色名]/` 目录下的参考音频文件名一致（不含扩展名）
2. `modelToPromptLanguage` 中为每个模型设置其主要支持的语言代码
3. 模型名称（如"男声-标准普通话"）必须与 `api_Model` 下的文件夹名一致
4. 同时也应与数据库 `models` 表中的 `value` 字段值保持一致

请根据自己的环境配置以下路径：
1. 确保基础预训练模型路径正确
2. 根据GPU情况调整 `infer_device` 参数，无GPU时设为"cpu"
3. 检查 `api_port` 设置，确保与后端配置一致

#### 3.4 配置并启动修改版 API 服务
启动 API 服务器:
```bash
cd /path/to/GPT-SoVITS
python apiV3.py --port 9870 --host 0.0.0.0
```

API参数说明:
- `--port`: 设置API服务端口（默认9870）
- `--host`: 设置API服务IP地址（0.0.0.0表示接受所有网络连接）

#### 3.5 配置连接到 GPT-SoVITS API
修改 `backend/services/queueService.js` 中的 API 地址:

```javascript
// 调用外部 API 生成语音
const response = await axios.post(process.env.TTS_API_URL || 'http://192.168.0.53:9870/', {
    text,
    text_language,
    model_name,
}, {
    headers: {
        'Content-Type': 'application/json'
    },
    responseType: 'arraybuffer'
});
```

### 4. 验证部署

#### 4.1 前端验证
访问前端服务地址 (默认为 http://localhost:8080)，确认网站能够正常加载。

#### 4.2 后端验证
```bash
# 测试后端 API
curl http://localhost:5000/models
# 应返回模型数据或加密的模型数据
```

#### 4.3 GPT-SoVITS API 验证
```bash
# 测试 GPT-SoVITS API
curl -X POST http://192.168.0.53:9870/ \
   -H "Content-Type: application/json" \
   -d '{"text":"测试文本","text_language":"zh","model_name":"男声-标准普通话",}'
# 应返回一个音频数据流
```

### 5. 常见问题排查

#### 5.1 无法连接到数据库
- 检查数据库用户名和密码是否正确
- 确认数据库服务是否正在运行: `sudo systemctl status mysql`
- 检查数据库连接字符串配置
- 确保本地防火墙没有阻止 MySQL 端口 (3306)

#### 5.2 Redis 连接失败
- 确认 Redis 服务是否正在运行: `sudo systemctl status redis`
- 检查 Redis 连接字符串配置
- 确保本地防火墙没有阻止 Redis 端口 (6379)

#### 5.3 GPT-SoVITS API 不可用
- 确认 GPT-SoVITS 服务是否正在运行
- 检查 `api_Model` 文件夹结构是否正确
- 确认参考音频文件名是否与 config.py 中的 modelToPromptText 值一致
- 检查 config.py 配置是否正确
- 验证 API 地址配置是否正确
- 检查 Python 环境和依赖是否完整
- 确认已安装修改版apiV3.py所需的额外依赖

#### 5.4 前端编译失败
- 清除 node_modules 并重新安装: `rm -rf node_modules && npm install`
- 检查 Node.js 版本是否兼容
- 检查前端依赖是否安装完整

## 日常维护

### 数据库备份
```bash
# 备份整个数据库
mysqldump -u text_to_speech -p text_to_speech > backup_$(date +%Y%m%d).sql

# 自动定期备份的 cron 任务
# 每天凌晨 2 点备份数据库
# 0 2 * * * mysqldump -u text_to_speech -p'YourStrongPassword' text_to_speech > /path/to/backups/backup_$(date +\%Y\%m\%d).sql
```

### 日志管理
```bash
# 如果使用 PM2，查看日志
pm2 logs text-to-speech-backend

# 设置日志轮转 (防止日志文件过大)
pm2 install pm2-logrotate
```

### 系统监控
推荐使用 PM2 监控或搭配 Prometheus + Grafana 进行全面监控:
```bash
# PM2 监控
pm2 monit

# 安装 Prometheus 和 Grafana 请参考相关文档
```

## 鸣谢

- 感谢 [GPT-SoVITS](https://github.com/RVC-Boss/GPT-SoVITS) 项目团队提供的出色语音合成技术支持(花佬NB~~)

## 许可证

MIT
