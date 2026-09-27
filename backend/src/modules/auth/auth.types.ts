import type { AuthenticatedUserDto } from '@salateca/contracts';

export interface StoredUser extends AuthenticatedUserDto {
  passwordHash: string;
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<StoredUser | null>;
  findUserBySession(tokenHash: string): Promise<AuthenticatedUserDto | null>;
  createSession(tokenHash: string, userId: number, expiresAt: Date): Promise<void>;
  deleteSession(tokenHash: string): Promise<void>;
  savePasswordResetToken(tokenHash: string, userId: number, expiresAt: Date): Promise<void>;
  consumePasswordResetToken(tokenHash: string, passwordHash: string): Promise<boolean>;
  deletePasswordResetToken(tokenHash: string): Promise<void>;
  upsertAdmin(email: string, passwordHash: string): Promise<void>;
}

export interface LoginResult {
  user: AuthenticatedUserDto;
  token: string;
  expiresAt: Date;
}

export interface PasswordResetRequest {
  email: string;
  token: string;
  expiresAt: Date;
}

export interface PasswordResetMailer {
  send(request: PasswordResetRequest): Promise<void>;
}
