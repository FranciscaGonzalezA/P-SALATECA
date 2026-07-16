import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const seedsDirectory = resolve(process.cwd(), '../database/seeds');
const connection = await mysql.createConnection({
  host: env.MYSQL_HOST,
  port: env.MYSQL_PORT,
  database: env.MYSQL_DATABASE,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  charset: 'utf8mb4',
  multipleStatements: true,
});

try {
  const files = (await readdir(seedsDirectory))
    .filter((filename) => filename.endsWith('.sql'))
    .sort();

  for (const filename of files) {
    const sql = await readFile(resolve(seedsDirectory, filename), 'utf8');
    await connection.query(sql);
    console.info(`Seed aplicado: ${filename}`);
  }
} finally {
  await connection.end();
}
