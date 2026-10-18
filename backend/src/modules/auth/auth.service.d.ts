import type { AuthRepository, LoginResult, PasswordResetRequest } from './auth.types.js';
export declare function hashSessionToken(token: string): string;
export declare const hashPasswordResetToken: typeof hashSessionToken;
export declare class AuthService {
  private readonly repository;
  private readonly sessionDurationHours;
  private readonly passwordResetDurationMinutes;
  constructor(
    repository: AuthRepository,
    sessionDurationHours?: number,
    passwordResetDurationMinutes?: number,
  );
  login(email: string, password: string): Promise<LoginResult | null>;
  findUserByToken(
    token: string,
  ): Promise<import('@salateca/contracts').AuthenticatedUserDto | null>;
  logout(token: string): Promise<void>;
  requestPasswordReset(email: string): Promise<PasswordResetRequest | null>;
  resetPassword(token: string, password: string): Promise<boolean>;
  deletePasswordResetToken(token: string): Promise<void>;
  bootstrapAdmin(email: string, password: string): Promise<void>;
}
