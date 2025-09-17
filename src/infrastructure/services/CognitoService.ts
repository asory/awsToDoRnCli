import { signIn, signUp, confirmSignUp, signOut, fetchAuthSession, getCurrentUser, resendSignUpCode, resetPassword, confirmResetPassword, updatePassword } from 'aws-amplify/auth';
import { User, AuthTokens, LoginCredentials, RegisterData } from '../../core/entities/User';
import { AuthRepository } from '../../core/repositories/AuthRepository';
import { SecureStorage } from '../storage/SecureStorage';
import { ScopeUtils } from '../../shared/utils/ScopeUtils';

export class CognitoService implements AuthRepository {
  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      const result = await signIn({
        username: credentials.email,
        password: credentials.password,
      });


      // Handle signIn next steps
      if (result.nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
        throw new Error('Email confirmation required. Please check your email for a confirmation code.');
      } else if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        throw new Error('Password reset required. Please set a new password.');
      } else if (result.nextStep?.signInStep === 'RESET_PASSWORD') {
        throw new Error('Password reset required. Please check your email for reset instructions.');
      } else if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE') {
        throw new Error('Authenticator code required. Please enter your TOTP code.');
      }

      if (result.isSignedIn) {
        const session = await fetchAuthSession();
        const tokens = this.extractTokens(session);
        const user = await this.getCurrentUser();

        if (!user) {
          throw new Error('Failed to retrieve user information after login');
        }

        // Store tokens securely 
        await SecureStorage.storeToken('access', tokens.accessToken, tokens.expiresIn ? (tokens.expiresIn - Date.now()) / 1000 : undefined);

        if (tokens.refreshToken) {
          await SecureStorage.storeToken('refresh', tokens.refreshToken);
        }

        return { user, tokens };
      } else {
        console.error('Login failed - not signed in', result);
        throw new Error('Authentication failed: Invalid credentials or account not verified');
      }
    } catch (error: any) {

      const mappedError = this.mapCognitoError(error);
      throw new Error(`Login failed: ${mappedError}`);
    }
  }

  async register(data: RegisterData): Promise<User> {
    try {
      const result = await signUp({
        username: data.email,
        password: data.password,
        options: {
          userAttributes: {
            email: data.email,
          },
        },
      });

      return {
        id: result.userId || data.email,
        email: data.email,
        username: data.username,
      };
    } catch (error: any) {
      const mappedError = this.mapCognitoError(error);
      throw new Error(`Registration failed: ${mappedError}`);
    }
  }

  async logout(): Promise<void> {
    try {
      // Invalidate session 
      await signOut({ global: true }); 

      await SecureStorage.clearAll();

    } catch (error: any) {
      try {
        await SecureStorage.clearAll();
      } catch (cleanupError) {
        console.error('Failed to clear local data during logout error:', cleanupError);
      }
      const mappedError = this.mapCognitoError(error);
      throw new Error(`Logout failed: ${mappedError}`);
    }
  }


  async refreshToken(_refreshToken: string): Promise<AuthTokens> {
    try {
      const session = await fetchAuthSession();
      return this.extractTokens(session);
    } catch (error: any) {
      console.error('Token refresh failed', error);
      const mappedError = this.mapCognitoError(error);
      throw new Error(`Token refresh failed: ${mappedError}`);
    }
  }

  async shouldRefreshToken(): Promise<boolean> {
    try {
      const accessToken = await SecureStorage.getToken('access');
      if (!accessToken) return false;

      // Check if token is expiring within the next 5 minutes
      return SecureStorage.isTokenExpiringSoon(accessToken, 5);
    } catch (error) {
      console.error('Error checking if token should refresh:', error);
      return false;
    }
  }

  async refreshTokenIfNeeded(): Promise<AuthTokens | null> {
    try {
      const shouldRefresh = await this.shouldRefreshToken();
      if (!shouldRefresh) {
        return null;
      }

      const refreshTokenValue = await SecureStorage.getToken('refresh');
      if (!refreshTokenValue) {
        return null;
      }

      const newTokens = await this.refreshToken(refreshTokenValue);

      // Store new tokens securely with expiration
      await SecureStorage.storeToken('access', newTokens.accessToken, newTokens.expiresIn ? (newTokens.expiresIn - Date.now()) / 1000 : undefined);
      if (newTokens.refreshToken) {
        await SecureStorage.storeToken('refresh', newTokens.refreshToken);
      }

      return newTokens;
    } catch (error) {
      console.error('Proactive token refresh failed:', error);
      return null;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const user = await getCurrentUser();
      return {
        id: user.userId,
        email: user.signInDetails?.loginId || '',
        username: user.username,
      };
    } catch (error: any) {
      const mappedError = this.mapCognitoError(error);
      console.error(`Failed to get current user', ${mappedError}`);
      return null;
    }
  }

  async confirmEmail(email: string, code: string): Promise<void> {
    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code,
      });
    } catch (error: any) {
      console.error('Email confirmation failed', error);
      const mappedError = this.mapCognitoError(error);
      throw new Error(`Email confirmation failed: ${mappedError}`);
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      await resetPassword({ username: email });
    } catch (error: any) {
      console.error('Forgot password failed', error);
      const mappedError = this.mapCognitoError(error);
      throw new Error(`Forgot password failed: ${mappedError}`);
    }
  }

  async confirmForgotPassword(email: string, code: string, newPassword: string): Promise<void> {
    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword: newPassword,
      });
    } catch (error: any) {
      console.error('Password reset failed', error);
      const mappedError = this.mapCognitoError(error);
      throw new Error(`Password reset failed: ${mappedError}`);
    }
  }

  async resendSignUpCode(email: string): Promise<void> {
    try {
      await resendSignUpCode({ username: email });
      console.log('Sign-up code resent successfully');
    } catch (error: any) {
      console.error('Resend sign-up code failed', error);
      const mappedError = this.mapCognitoError(error);
      throw new Error(`Resend sign-up code failed: ${mappedError}`);
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      await resetPassword({ username: email });
      console.log('Password reset initiated successfully');
    } catch (error: any) {
      console.error('Reset password failed', error);
      const mappedError = this.mapCognitoError(error);
      throw new Error(`Reset password failed: ${mappedError}`);
    }
  }

  async confirmResetPassword(email: string, code: string, newPassword: string): Promise<void> {
    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword: newPassword,
      });
      console.log('Password reset confirmed successfully');
    } catch (error: any) {
      console.error('Confirm reset password failed', error);
      const mappedError = this.mapCognitoError(error);
      throw new Error(`Confirm reset password failed: ${mappedError}`);
    }
  }

  async updatePassword(oldPassword: string, newPassword: string): Promise<void> {
    try {
      await updatePassword({
        oldPassword,
        newPassword,
      });
      console.log('Password updated successfully');
    } catch (error: any) {
      console.error('Update password failed', error);
      const mappedError = this.mapCognitoError(error);
      throw new Error(`Update password failed: ${mappedError}`);
    }
  }


  private extractTokens(session: any): AuthTokens {

    if (!session || !session.tokens) {
      throw new Error('Invalid session: No tokens available');
    }

    const accessToken = session.tokens.accessToken?.toString();
    const refreshToken = session.tokens.refreshToken?.toString();
    const idToken = session.tokens.idToken?.toString();

    if (!accessToken || !idToken) {
      throw new Error('Invalid session: Missing required tokens');
    }

    const expiresIn = session.tokens.accessToken?.payload?.exp * 1000 || 0;

    if (expiresIn && expiresIn < Date.now()) {
      throw new Error('Token has expired');
    }

    const scopes = ScopeUtils.extractScopesFromToken(accessToken);

    return {
      accessToken,
      refreshToken: refreshToken || '',
      idToken,
      expiresIn,
      tokenType: 'Bearer',
      scopes,
    };
  }

  async hasScope(requiredScope: string, userScopes?: string[]): Promise<boolean> {
    if (userScopes) {
      return userScopes.includes(requiredScope);
    }
    try {
      const accessToken = await SecureStorage.getToken('access');
      if (!accessToken) return false;

      const scopes = ScopeUtils.extractScopesFromToken(accessToken);
      return scopes.includes(requiredScope);
    } catch (error) {
      console.error('Error checking scope:', error);
      return false;
    }
  }

  async getScopes(): Promise<string[]> {
    try {
      const accessToken = await SecureStorage.getToken('access');
      if (!accessToken) return [];

      return ScopeUtils.extractScopesFromToken(accessToken);
    } catch (error) {
      console.error('Error getting scopes:', error);
      return [];
    }
  }

  async signUp(params: any): Promise<any> {
    try {
      const result = await signUp(params);
      return { isSignUpComplete: result.isSignUpComplete, userId: result.userId, nextStep: result.nextStep };
    } catch (error: any) {
      console.error('❌ Error en registro:', error);
      const mappedError = this.mapCognitoError(error);
      throw new Error(`Sign up failed: ${mappedError}`);
    }
  }

  async confirmSignUp(params: any): Promise<any> {
    try {
      const result = await confirmSignUp(params);
      return { isSignUpComplete: result.isSignUpComplete, nextStep: result.nextStep };
    } catch (error: any) {
      console.error('❌ Error confirmando registro:', error);
      const mappedError = this.mapCognitoError(error);
      throw new Error(`Confirm sign up failed: ${mappedError}`);
    }
  }

  async signIn(params: any): Promise<any> {
    try {
      const result = await signIn(params);
      return { isSignedIn: result.isSignedIn, nextStep: result.nextStep };
    } catch (error: any) {
      console.error('❌ Error iniciando sesión:', error);
      const mappedError = this.mapCognitoError(error);
      throw new Error(`Sign in failed: ${mappedError}`);
    }
  }

  async getAuthTokens(): Promise<AuthTokens | null> {
    try {
      const session = await fetchAuthSession();
      if (session.tokens) {
        return this.extractTokens(session);
      }
      return null;
    } catch (error: any) {
      console.error('❌ Error obteniendo tokens:', error);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const user = await getCurrentUser();
      return !!user;
    } catch {
      return false;
    }
  }

  /**
   * Verify user credentials without creating a new session
   * Used for re-authentication purposes
   */
  async verifyCredentials(credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> {
    try {
      // Attempt to sign in to verify credentials
      const result = await signIn({
        username: credentials.email,
        password: credentials.password,
      });

      if (result.isSignedIn) {
        // If successful, immediately sign out to maintain current session
        try {
          await signOut({ global: false }); // Local sign out only
        } catch (signOutError) {
          console.warn('Failed to sign out after credential verification:', signOutError);
        }
        return { success: true };
      } else {
        return { success: false, error: 'Invalid credentials' };
      }
    } catch (error: any) {
      const mappedError = this.mapCognitoError(error);
      return { success: false, error: mappedError };
    }
  }

  private mapCognitoError(error: any): string {
    const errorCode = error.code || error.name;
    const errorMessage = error.message || '';

    const errorMap: { [key: string]: string } = {
      'UserNotFoundException': 'No account found with this email address. Please check your email or sign up.',
      'NotAuthorizedException': 'Incorrect email or password. Please try again.',
      'UserNotConfirmedException': 'Your email address is not confirmed. Please check your email for a confirmation code.',
      'TooManyRequestsException': 'Too many login attempts. Please wait a few minutes before trying again.',
      'InvalidParameterException': 'Invalid input provided. Please check your email and password.',
      'CodeMismatchException': 'Invalid confirmation code. Please try again.',
      'ExpiredCodeException': 'Confirmation code has expired. Please request a new one.',
      'LimitExceededException': 'Too many attempts. Please try again later.',
      'InvalidPasswordException': 'Password does not meet requirements. Please choose a stronger password.',
      'UsernameExistsException': 'An account with this email already exists. Please try logging in instead.',
      'AliasExistsException': 'This email is already associated with another account.',
      'NetworkError': 'Network connection error. Please check your internet connection and try again.',
    };

    return errorMap[errorCode] || errorMessage || 'An unexpected error occurred. Please try again.';
  }
}

export const cognitoService = new CognitoService();