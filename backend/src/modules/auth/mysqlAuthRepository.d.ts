import type { AuthenticatedUserDto } from '@salateca/contracts';
import type { Pool } from 'mysql2/promise';
import type { AuthRepository, StoredUser } from './auth.types.js';
export declare class MysqlAuthRepository implements AuthRepository {
  private readonly pool;
  constructor(pool?: Pool);
  findUserByEmail(email: string): Promise<StoredUser | null>;
  findUserBySession(tokenHash: string): Promise<AuthenticatedUserDto | null>;
  createSession(tokenHash: string, userId: number, expiresAt: Date): Promise<void>;
  deleteSession(tokenHash: string): Promise<void>;
  savePasswordResetToken(tokenHash: string, userId: number, expiresAt: Date): Promise<void>;
  consumePasswordResetToken(tokenHash: string, passwordHash: string): Promise<boolean>;
  deletePasswordResetToken(tokenHash: string): Promise<void>;
  upsertAdmin(email: string, passwordHash: string): Promise<void>;
}
