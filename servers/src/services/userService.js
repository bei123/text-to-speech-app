userService.js// src/services/userService.js
import bcrypt from 'bcryptjs';
import { pool } from '../utils/database.js';
import config from '../config/index.js';
import { generateEncryptionKey } from '../utils/crypto.js';

export default class UserService {
  /**
   * 创建新用户（带事务支持）
   * @param {string} email - 用户邮箱
   * @param {string} password - 明文密码
   * @returns {Promise<object>} 创建的用户对象（不含敏感信息）
   */
  static async createUser(email, password) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 生成加密凭证
      const salt = await bcrypt.genSalt(config.security.saltRounds);
      const passwordHash = await bcrypt.hash(password, salt);
      const encryptionKey = generateEncryptionKey();

      // 插入用户记录
      const [result] = await connection.query(
        `INSERT INTO users 
        (email, password_hash, encryption_key, is_active) 
        VALUES (?, ?, ?, TRUE)`,
        [email, passwordHash, encryptionKey]
      );

      // 创建用户配置
      await connection.query(
        `INSERT INTO user_profiles 
        (user_id, language, timezone) 
        VALUES (?, ?, ?)`,
        [result.insertId, config.default.language, config.default.timezone]
      );

      await connection.commit();

      return {
        id: result.insertId,
        email,
        created_at: new Date()
      };
    } catch (error) {
      await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('EMAIL_ALREADY_EXISTS');
      }
      throw new Error('USER_CREATION_FAILED');
    } finally {
      connection.release();
    }
  }

  /**
   * 获取用户完整信息（带敏感字段过滤）
   * @param {number} userId - 用户ID
   * @returns {Promise<object|null>} 用户信息对象
   */
  static async getUserById(userId) {
    try {
      const [users] = await pool.query(
        `SELECT 
          u.id, u.email, u.encryption_key, 
          u.created_at, u.last_login,
          up.language, up.timezone
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE u.id = ? AND u.is_active = TRUE`,
        [userId]
      );
      
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      throw new Error('USER_FETCH_FAILED');
    }
  }

  /**
   * 更新用户信息（原子操作）
   * @param {number} userId - 用户ID 
   * @param {object} updates - 更新字段对象
   */
  static async updateUser(userId, updates) {
    const validFields = ['email', 'language', 'timezone'];
    const updatesToApply = Object.keys(updates)
      .filter(key => validFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    if (Object.keys(updatesToApply).length === 0) {
      throw new Error('NO_VALID_FIELDS');
    }

    try {
      // 更新用户主表
      if (updatesToApply.email) {
        await pool.query(
          'UPDATE users SET email = ? WHERE id = ?',
          [updatesToApply.email, userId]
        );
      }

      // 更新配置表
      const profileUpdates = {};
      if (updatesToApply.language) profileUpdates.language = updatesToApply.language;
      if (updatesToApply.timezone) profileUpdates.timezone = updatesToApply.timezone;

      if (Object.keys(profileUpdates).length > 0) {
        await pool.query(
          'UPDATE user_profiles SET ? WHERE user_id = ?',
          [profileUpdates, userId]
        );
      }

      return { success: true };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('EMAIL_ALREADY_EXISTS');
      }
      throw new Error('USER_UPDATE_FAILED');
    }
  }

  /**
   * 安全删除用户（标记删除）
   * @param {number} userId - 用户ID
   */
  static async deleteUser(userId) {
    try {
      await pool.query(
        `UPDATE users 
        SET 
          is_active = FALSE,
          encryption_key = NULL,
          deleted_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [userId]
      );
      return { success: true };
    } catch (error) {
      throw new Error('USER_DELETION_FAILED');
    }
  }

  /**
   * 分页获取用户列表
   * @param {number} page - 页码
   * @param {number} pageSize - 每页数量
   */
  static async getUsers(page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    
    try {
      const [users] = await pool.query(
        `SELECT 
          u.id, u.email, u.created_at, u.last_login,
          up.language, up.timezone
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE u.is_active = TRUE
        LIMIT ? OFFSET ?`,
        [pageSize, offset]
      );

      const [countResult] = await pool.query(
        'SELECT COUNT(*) AS total FROM users WHERE is_active = TRUE'
      );

      return {
        data: users,
        pagination: {
          page,
          pageSize,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / pageSize)
        }
      };
    } catch (error) {
      throw new Error('USER_LIST_FETCH_FAILED');
    }
  }
}