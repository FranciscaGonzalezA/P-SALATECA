import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

export const databasePool = mysql.createPool({
  host: env.MYSQL_HOST,
  port: env.MYSQL_PORT,
  database: env.MYSQL_DATABASE,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  connectionLimit: env.MYSQL_CONNECTION_LIMIT,
  enableKeepAlive: true,
  charset: 'utf8mb4',
  timezone: 'Z',
  dateStrings: true,
});
