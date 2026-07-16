import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import { env } from '../config/env.js';

interface MigrationRow extends RowDataPacket {
  filename: string;
}

const migrationsDirectory = resolve(process.cwd(), '../database/migrations');
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
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE = InnoDB
  `);

  const [rows] = await connection.query<MigrationRow[]>('SELECT filename FROM schema_migrations');
  const applied = new Set(rows.map((row) => row.filename));
  const files = (await readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith('.sql'))
    .sort();

  for (const filename of files) {
    if (applied.has(filename)) {
      console.info(`Omitiendo ${filename}; ya fue aplicada.`);
      continue;
    }

    const sql = await readFile(resolve(migrationsDirectory, filename), 'utf8');
    await connection.query(sql);
    await connection.execute('INSERT INTO schema_migrations (filename) VALUES (?)', [filename]);
    console.info(`Migración aplicada: ${filename}`);
  }
} finally {
  await connection.end();
}
