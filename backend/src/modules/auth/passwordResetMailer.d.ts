import type { PasswordResetMailer, PasswordResetRequest } from './auth.types.js';
export declare class ResendPasswordResetMailer implements PasswordResetMailer {
  send(request: PasswordResetRequest): Promise<void>;
}
