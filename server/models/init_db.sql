-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 创建音频请求表
CREATE TABLE IF NOT EXISTS audio_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    text TEXT NOT NULL,
    text_language VARCHAR(10) DEFAULT 'zh-CN',
    model_name VARCHAR(50) NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建音频文件表
CREATE TABLE IF NOT EXISTS audio_files (
    id INT PRIMARY KEY AUTO_INCREMENT,
    request_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES audio_requests(id) ON DELETE CASCADE
);

-- 创建刷新令牌表（可选，如果不使用Redis存储刷新令牌）
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建用户设置表
CREATE TABLE IF NOT EXISTS user_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    preferred_language VARCHAR(10) DEFAULT 'zh-CN',
    preferred_model VARCHAR(50),
    theme VARCHAR(20) DEFAULT 'light',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 插入测试用户（开发环境使用）
INSERT IGNORE INTO users (username, email, password) 
VALUES ('testuser', 'test@example.com', '$2b$10$GjZhbGmzMGCOFLkvEVuO/u/aR4QUAnhjxg3zEPf7JXAgC2ASJAVgy'); -- 密码: password123

-- 插入默认模型（可以根据实际情况调整）
INSERT IGNORE INTO audio_requests (user_id, text, model_name, status) 
VALUES (1, '这是一个测试文本', 'neural-zh-CN', 'completed');

-- 插入用户设置
INSERT IGNORE INTO user_settings (user_id, preferred_language, preferred_model) 
VALUES (1, 'zh-CN', 'neural-zh-CN');
