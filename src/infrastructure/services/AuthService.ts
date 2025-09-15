import { SignUpInput, SignInInput, ConfirmSignUpInput } from 'aws-amplify/auth';
import { ScopeUtils } from '../../shared/utils/ScopeUtils';
import { CognitoService } from './CognitoService';

export interface User {
  username: string;
  email?: string;
  attributes?: Record<string, any>;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  scopes?: string[];
}

class AuthService {
  private cognitoService: CognitoService;

  constructor() {
    this.cognitoService = new CognitoService();
  }

  /**
   * Registrar un nuevo usuario
   */
  async signUp(params: SignUpInput): Promise<any> {
    return await this.cognitoService.signUp(params);
  }

  /**
   * Confirmar registro con código de verificación
   */
  async confirmSignUp(params: ConfirmSignUpInput): Promise<any> {
    return await this.cognitoService.confirmSignUp(params);
  }

  /**
   * Iniciar sesión
   */
  async signIn(params: SignInInput): Promise<any> {
    return await this.cognitoService.signIn(params);
  }

  /**
   * Cerrar sesión
   */
  async signOut(): Promise<void> {
    await this.cognitoService.logout();
  }

  /**
   * Obtener usuario actual
   */
  async getCurrentUser(): Promise<User | null> {
    const cognitoUser = await this.cognitoService.getCurrentUser();
    if (cognitoUser) {
      return {
        username: cognitoUser.username || '',
        email: cognitoUser.email,
        attributes: {},
      };
    }
    return null;
  }

  /**
   * Obtener tokens de autenticación
   */
  async getAuthTokens(): Promise<AuthTokens | null> {
    return await this.cognitoService.getAuthTokens();
  }

  /**
   * Extraer scopes del token JWT
   */
  private extractScopesFromToken(token: string): string[] {
    return ScopeUtils.extractScopesFromToken(token);
  }


  /**
   * Verificar si el usuario tiene un scope específico
   */
  async hasScope(requiredScope: string, userScopes?: string[]): Promise<boolean> {
    return await this.cognitoService.hasScope(requiredScope, userScopes);
  }

  /**
    * Reenviar código de confirmación
    */
   async resendSignUpCode(email: string): Promise<any> {
     await this.cognitoService.resendSignUpCode(email);
     return { success: true };
   }

  /**
    * Solicitar restablecimiento de contraseña
    */
   async resetPassword(email: string): Promise<any> {
     await this.cognitoService.resetPassword(email);
     return { success: true };
   }

  /**
    * Confirmar restablecimiento de contraseña
    */
   async confirmResetPassword(email: string, code: string, newPassword: string): Promise<void> {
     await this.cognitoService.confirmResetPassword(email, code, newPassword);
   }

  /**
    * Cambiar contraseña
    */
   async updatePassword(oldPassword: string, newPassword: string): Promise<void> {
     await this.cognitoService.updatePassword(oldPassword, newPassword);
   }

  /**
   * Verificar si el usuario está autenticado
   */
  async isAuthenticated(): Promise<boolean> {
    return await this.cognitoService.isAuthenticated();
  }
}

export const authService = new AuthService();
export default authService;
