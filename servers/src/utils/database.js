import mysql from 'mysql2/promise';
import config from '../config/index.js';

const pool = mysql.createPool(config.db);

export { pool };