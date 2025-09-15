import { User, AuthTokens, LoginCredentials, RegisterData } from '../entities/User';

export interface AuthRepository {
  login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }>;
  register(data: RegisterData): Promise<User>;
  logout(): Promise<void>;
  refreshToken(refreshToken: string): Promise<AuthTokens>;
  getCurrentUser(): Promise<User | null>;
  confirmEmail(email: string, code: string): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  confirmForgotPassword(email: string, code: string, newPassword: string): Promise<void>;
  resendSignUpCode(email: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  confirmResetPassword(email: string, code: string, newPassword: string): Promise<void>;
  updatePassword(oldPassword: string, newPassword: string): Promise<void>;
  hasScope(scope: string): Promise<boolean>;
  getScopes(): Promise<string[]>;
}