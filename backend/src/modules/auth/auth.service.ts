import { createHash, randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';
import type { AuthRepository, LoginResult } from './auth.types.js';
import { hashPassword, verifyPassword } from './password.js';

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly sessionDurationHours = env.SESSION_DURATION_HOURS,
  ) {}

  async login(email: string, password: string): Promise<LoginResult | null> {
    const storedUser = await this.repository.findUserByEmail(email.trim().toLowerCase());
    const passwordMatches = await verifyPassword(password, storedUser?.passwordHash ?? 'invalid');
    if (!storedUser || !passwordMatches) return null;

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.sessionDurationHours * 60 * 60 * 1000);
    await this.repository.createSession(hashSessionToken(token), storedUser.id, expiresAt);
    const { passwordHash: _passwordHash, ...user } = storedUser;
    void _passwordHash;
    return { user, token, expiresAt };
  }

  findUserByToken(token: string) {
    return this.repository.findUserBySession(hashSessionToken(token));
  }

  logout(token: string) {
    return this.repository.deleteSession(hashSessionToken(token));
  }

  async bootstrapAdmin(email: string, password: string): Promise<void> {
    await this.repository.upsertAdmin(email.trim().toLowerCase(), await hashPassword(password));
  }
}
