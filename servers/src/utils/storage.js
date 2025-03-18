// src/utils/storage.js
import fs from 'fs/promises';
import path from 'path';
import { fileTypeFromFile } from 'file-type';
import { v4 as uuidv4 } from 'uuid';
import cryptoUtils from './cryptoUtils.js';
import config from '../config/index.js';

export default class FileStorage {
  constructor(options = {}) {
    this.basePath = options.basePath || config.storage.basePath;
    this.tempTTL = options.tempTTL || config.storage.tempRetention;
    this.encryptionEnabled = options.encrypt || config.storage.encryptFiles;
  }

  /**
   * 生成存储路径（带日期目录）
   * @param {string} fileName - 原始文件名
   * @param {boolean} isTemp - 是否为临时文件
   */
  #generatePath(fileName, isTemp = false) {
    const date = new Date();
    const dir = path.join(
      this.basePath,
      isTemp ? 'temp' : 'persist',
      `${date.getFullYear()}`,
      `${date.getMonth() + 1}`.padStart(2, '0')
    );

    return {
      fullPath: path.join(dir, `${uuidv4()}_${fileName}`),
      targetDir: dir
    };
  }

  /**
   * 安全写入文件（自动创建目录）
   * @param {string} filePath - 目标路径
   * @param {Buffer} data - 文件内容
   */
  async #safeWrite(filePath, data) {
    try {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, data);
      return true;
    } catch (error) {
      throw new Error('FILE_WRITE_FAILED');
    }
  }

  /**
   * 保存文件（自动处理加密和元数据）
   * @param {Buffer} buffer - 文件内容
   * @param {object} options - 存储选项
   */
  async saveFile(buffer, options = {}) {
    try {
      const { isTemp = false, originalName = 'file' } = options;
      const { fullPath, targetDir } = this.#generatePath(originalName, isTemp);

      // 处理文件加密
      let processedData = buffer;
      if (this.encryptionEnabled && options.encryptionKey) {
        processedData = Buffer.from(
          cryptoUtils.encryptData(buffer.toString('base64'), options.encryptionKey),
          'utf8'
        );
      }

      // 写入物理文件
      await this.#safeWrite(fullPath, processedData);

      // 返回存储元数据
      return {
        fileName: path.basename(fullPath),
        storagePath: fullPath,
        mimeType: (await fileTypeFromFile(fullPath))?.mime || 'application/octet-stream',
        size: processedData.byteLength,
        isTemp,
        expiresAt: isTemp ? Date.now() + this.tempTTL : null
      };
    } catch (error) {
      throw new Error('STORAGE_SAVE_FAILED');
    }
  }

  /**
   * 读取文件内容（自动解密）
   * @param {string} filePath - 存储路径
   * @param {string} encryptionKey - 加密密钥
   */
  async readFile(filePath, encryptionKey) {
    try {
      const buffer = await fs.readFile(filePath);
      
      if (!this.encryptionEnabled || !encryptionKey) {
        return buffer;
      }

      const decrypted = cryptoUtils.decryptData(
        buffer.toString('utf8'),
        encryptionKey
      );
      return Buffer.from(decrypted, 'base64');
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('FILE_NOT_FOUND');
      }
      throw new Error('FILE_READ_FAILED');
    }
  }

  /**
   * 删除文件（物理删除）
   * @param {string} filePath - 存储路径
   */
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') return false;
      throw new Error('FILE_DELETE_FAILED');
    }
  }

  /**
   * 查找过期临时文件
   */
  async findExpiredTempFiles() {
    try {
      const tempDir = path.join(this.basePath, 'temp');
      const now = Date.now();

      const walkDir = async (dir) => {
        let results = [];
        const list = await fs.readdir(dir, { withFileTypes: true });

        for (const item of list) {
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory()) {
            results = results.concat(await walkDir(fullPath));
          } else {
            const { birthtime } = await fs.stat(fullPath);
            if (now - birthtime.getTime() > this.tempTTL) {
              results.push(fullPath);
            }
          }
        }
        return results;
      };

      return walkDir(tempDir);
    } catch (error) {
      throw new Error('TEMP_FILE_SCAN_FAILED');
    }
  }

  /**
   * 清理存储目录（按保留策略）
   */
  async cleanup() {
    try {
      const expiredFiles = await this.findExpiredTempFiles();
      const deleteOps = expiredFiles.map(f => this.deleteFile(f));
      return Promise.allSettled(deleteOps);
    } catch (error) {
      throw new Error('STORAGE_CLEANUP_FAILED');
    }
  }

  /**
   * 获取文件存储信息
   */
  getFileInfo(filePath) {
    return fs.stat(filePath).catch(() => null);
  }
}