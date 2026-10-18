import { databasePool } from '../../db/pool.js';
function mapUser(row) {
  return { id: row.id, email: row.email, role: row.role };
}
export class MysqlAuthRepository {
  pool;
  constructor(pool = databasePool) {
    this.pool = pool;
  }
  async findUserByEmail(email) {
    const [rows] = await this.pool.execute(
      `SELECT id, email, password_hash, role
       FROM users
       WHERE email = ? AND is_active = TRUE
       LIMIT 1`,
      [email],
    );
    const row = rows[0];
    return row ? { ...mapUser(row), passwordHash: row.password_hash } : null;
  }
  async findUserBySession(tokenHash) {
    const [rows] = await this.pool.execute(
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
  async createSession(tokenHash, userId, expiresAt) {
    await this.pool.execute(
      'INSERT INTO user_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
      [tokenHash, userId, expiresAt],
    );
  }
  async deleteSession(tokenHash) {
    await this.pool.execute('DELETE FROM user_sessions WHERE token_hash = ?', [tokenHash]);
  }
  async savePasswordResetToken(tokenHash, userId, expiresAt) {
    await this.pool.execute(
      `INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         token_hash = VALUES(token_hash),
         expires_at = VALUES(expires_at),
         created_at = UTC_TIMESTAMP(3),
         used_at = NULL`,
      [tokenHash, userId, expiresAt],
    );
  }
  async consumePasswordResetToken(tokenHash, passwordHash) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute(
        `SELECT prt.user_id
         FROM password_reset_tokens prt
         INNER JOIN users u ON u.id = prt.user_id
         WHERE prt.token_hash = ?
           AND prt.expires_at > UTC_TIMESTAMP(3)
           AND prt.used_at IS NULL
           AND u.is_active = TRUE
           AND u.role = 'admin'
         LIMIT 1
         FOR UPDATE`,
        [tokenHash],
      );
      const userId = rows[0]?.user_id;
      if (!userId) {
        await connection.rollback();
        return false;
      }
      await connection.execute('UPDATE users SET password_hash = ? WHERE id = ?', [
        passwordHash,
        userId,
      ]);
      await connection.execute('DELETE FROM user_sessions WHERE user_id = ?', [userId]);
      await connection.execute(
        'UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP(3) WHERE user_id = ?',
        [userId],
      );
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  async deletePasswordResetToken(tokenHash) {
    await this.pool.execute('DELETE FROM password_reset_tokens WHERE token_hash = ?', [tokenHash]);
  }
  async upsertAdmin(email, passwordHash) {
    await this.pool.execute(
      `INSERT INTO users (email, password_hash, role)
       VALUES (?, ?, 'admin')
       ON DUPLICATE KEY UPDATE
         role = 'admin',
         is_active = TRUE`,
      [email, passwordHash],
    );
  }
}
