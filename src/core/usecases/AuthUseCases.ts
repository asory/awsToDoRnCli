import { User, AuthTokens, LoginCredentials, RegisterData } from '../entities/User';
import { AuthRepository } from '../repositories/AuthRepository';

export class AuthUseCases {
  constructor(private authRepository: AuthRepository) {}

  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    return this.authRepository.login(credentials);
  }

  async logout(): Promise<void> {
    return this.authRepository.logout();
  }

  async register(data: RegisterData): Promise<User> {
    return this.authRepository.register(data);
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    return this.authRepository.refreshToken(refreshToken);
  }
}