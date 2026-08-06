import type { AuthenticatedUserDto, UserRole } from '@salateca/contracts';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { databasePool } from '../../db/pool.js';
import type { AuthRepository, StoredUser } from './auth.types.js';

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string;
  role: UserRole;
}

function mapUser(row: UserRow): AuthenticatedUserDto {
  return { id: row.id, email: row.email, role: row.role };
}

export class MysqlAuthRepository implements AuthRepository {
  constructor(private readonly pool: Pool = databasePool) {}

  async findUserByEmail(email: string): Promise<StoredUser | null> {
    const [rows] = await this.pool.execute<UserRow[]>(
      `SELECT id, email, password_hash, role
       FROM users
       WHERE email = ? AND is_active = TRUE
       LIMIT 1`,
      [email],
    );
    const row = rows[0];
    return row ? { ...mapUser(row), passwordHash: row.password_hash } : null;
  }

  async findUserBySession(tokenHash: string): Promise<AuthenticatedUserDto | null> {
    const [rows] = await this.pool.execute<UserRow[]>(
      `SELECT u.id, u.email, u.password_hash, u.role
       FROM user_sessions session
       INNER JOIN users u ON u.id = session.user_id
       WHERE session.token_hash = ?
         AND session.expires_at > UTC_TIMESTAMP(3)
         AND u.is_active = TRUE
       LIMIT 1`,
      [tokenHash],
    );
    const row = rows[0];
    if (!row) return null;

    await this.pool.execute(
      'UPDATE user_sessions SET last_used_at = UTC_TIMESTAMP(3) WHERE token_hash = ?',
      [tokenHash],
    );
    return mapUser(row);
  }

  async createSession(tokenHash: string, userId: number, expiresAt: Date): Promise<void> {
    await this.pool.execute(
      'INSERT INTO user_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
      [tokenHash, userId, expiresAt],
    );
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await this.pool.execute('DELETE FROM user_sessions WHERE token_hash = ?', [tokenHash]);
  }

  async upsertAdmin(email: string, passwordHash: string): Promise<void> {
    await this.pool.execute(
      `INSERT INTO users (email, password_hash, role)
       VALUES (?, ?, 'admin')
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         role = 'admin',
         is_active = TRUE`,
      [email, passwordHash],
    );
  }
}
