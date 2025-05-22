const { Sequelize } = require('sequelize');
const pool = require('./db');

// 创建 Sequelize 实例
const sequelize = new Sequelize({
  dialect: 'mysql',
  host: '127.0.0.1',
  username: 'text_to_speech',
  password: 'KSrJpjNsCSfp8WRH',
  database: 'text_to_speech',
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  logging: false // 设置为 true 可以看到 SQL 查询日志
});

// 测试数据库连接
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');
  } catch (error) {
    console.error('数据库连接失败:', error);
  }
};

// 同步数据库模型
const syncDatabase = async () => {
  try {
    await sequelize.sync();
    console.log('数据库同步完成');
  } catch (error) {
    console.error('数据库同步失败:', error);
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncDatabase
}; 