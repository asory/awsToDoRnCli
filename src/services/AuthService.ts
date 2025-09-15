import { 
  signUp, 
  confirmSignUp, 
  signIn, 
  signOut, 
  getCurrentUser,
  fetchAuthSession,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  updatePassword,
  SignUpInput,
  SignInInput,
  ConfirmSignUpInput,
  ResendSignUpCodeInput,
  ResetPasswordInput,
  ConfirmResetPasswordInput,
  UpdatePasswordInput
} from 'aws-amplify/auth';

export interface User {
  username: string;
  email?: string;
  attributes?: Record<string, any>;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

class AuthService {
  /**
   * Registrar un nuevo usuario
   */
  async signUp(params: SignUpInput): Promise<any> {
    try {
      const { isSignUpComplete, userId, nextStep } = await signUp(params);
      
      console.log('✅ Usuario registrado:', { isSignUpComplete, userId });
      return { isSignUpComplete, userId, nextStep };
    } catch (error) {
      console.error('❌ Error en registro:', error);
      throw error;
    }
  }

  /**
   * Confirmar registro con código de verificación
   */
  async confirmSignUp(params: ConfirmSignUpInput): Promise<any> {
    try {
      const { isSignUpComplete, nextStep } = await confirmSignUp(params);
      
      console.log('✅ Registro confirmado:', { isSignUpComplete });
      return { isSignUpComplete, nextStep };
    } catch (error) {
      console.error('❌ Error confirmando registro:', error);
      throw error;
    }
  }

  /**
   * Iniciar sesión
   */
  async signIn(params: SignInInput): Promise<any> {
    try {
      const { isSignedIn, nextStep } = await signIn(params);
      
      console.log('✅ Sesión iniciada:', { isSignedIn });
      return { isSignedIn, nextStep };
    } catch (error) {
      console.error('❌ Error iniciando sesión:', error);
      throw error;
    }
  }

  /**
   * Cerrar sesión
   */
  async signOut(): Promise<void> {
    try {
      await signOut();
      console.log('✅ Sesión cerrada correctamente');
    } catch (error) {
      console.error('❌ Error cerrando sesión:', error);
      throw error;
    }
  }

  /**
   * Obtener usuario actual
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const user = await getCurrentUser();
      console.log('✅ Usuario actual obtenido:', user);
      return {
        username: user.username,
        attributes: (user as any).attributes,
      };
    } catch (error) {
      console.log('ℹ️ No hay usuario autenticado');
      return null;
    }
  }

  /**
   * Obtener tokens de autenticación
   */
  async getAuthTokens(): Promise<AuthTokens | null> {
    try {
      const session = await fetchAuthSession();
      
      if (session.tokens) {
        return {
          accessToken: session.tokens.accessToken.toString(),
          idToken: session.tokens.idToken?.toString() || '',
          refreshToken: (session.tokens as any).refreshToken?.toString() || '',
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo tokens:', error);
      return null;
    }
  }

  /**
   * Reenviar código de confirmación
   */
  async resendSignUpCode(params: ResendSignUpCodeInput): Promise<any> {
    try {
      const result = await resendSignUpCode(params);
      console.log('✅ Código reenviado correctamente');
      return result;
    } catch (error) {
      console.error('❌ Error reenviando código:', error);
      throw error;
    }
  }

  /**
   * Solicitar restablecimiento de contraseña
   */
  async resetPassword(params: ResetPasswordInput): Promise<any> {
    try {
      const result = await resetPassword(params);
      console.log('✅ Restablecimiento de contraseña solicitado');
      return result;
    } catch (error) {
      console.error('❌ Error solicitando restablecimiento:', error);
      throw error;
    }
  }

  /**
   * Confirmar restablecimiento de contraseña
   */
  async confirmResetPassword(params: ConfirmResetPasswordInput): Promise<void> {
    try {
      await confirmResetPassword(params);
      console.log('✅ Contraseña restablecida correctamente');
    } catch (error) {
      console.error('❌ Error restableciendo contraseña:', error);
      throw error;
    }
  }

  /**
   * Cambiar contraseña
   */
  async updatePassword(params: UpdatePasswordInput): Promise<void> {
    try {
      await updatePassword(params);
      console.log('✅ Contraseña actualizada correctamente');
    } catch (error) {
      console.error('❌ Error actualizando contraseña:', error);
      throw error;
    }
  }

  /**
   * Verificar si el usuario está autenticado
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const user = await getCurrentUser();
      return !!user;
    } catch {
      return false;
    }
  }
}

export const authService = new AuthService();
export default authService;
