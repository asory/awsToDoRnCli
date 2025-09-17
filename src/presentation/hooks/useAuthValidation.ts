import { useCallback, useMemo } from 'react';
import { CognitoService } from '../../infrastructure/services/CognitoService';
import { useSecureTokenStorage } from './useSecureTokenStorage';

export interface AuthError {
  code: string;
  message: string;
  retryable: boolean;
  context?: string;
}

export const useAuthValidation = () => {
  const { validateStoredTokens, getStoredTokens } = useSecureTokenStorage();
  const cognitoService = useMemo(() => new CognitoService(), []);

  const handleAuthError = useCallback((error: any, context: string): AuthError => {
    const authError: AuthError = {
      code: error.code || error.name || 'UNKNOWN_ERROR',
      message: error.message || 'Unknow error',
      retryable: ['NetworkError', 'TooManyRequestsException', 'ThrottlingException'].includes(error.code || error.name),
      context
    };
    
    return authError;
  }, []);

  const validateCurrentSession = useCallback(async (): Promise<{ valid: boolean; user?: any; error?: AuthError }> => {
    try {
      const [isTokenValid, user] = await Promise.all([
        validateStoredTokens(),
        cognitoService.getCurrentUser()
      ]);

      if (!isTokenValid || !user) {
        return { 
          valid: false, 
          error: {
            code: 'INVALID_SESSION',
            message: 'invalid or expired session ',
            retryable: false,
            context: 'validateCurrentSession'
          }
        };
      }

      return { valid: true, user };
    } catch (error: any) {
      return { 
        valid: false, 
        error: handleAuthError(error, 'validateCurrentSession')
      };
    }
  }, [validateStoredTokens, cognitoService, handleAuthError]);

  const checkTokensAvailability = useCallback(async (): Promise<{ available: boolean; hasRefreshToken: boolean }> => {
    try {
      const { access, refresh } = await getStoredTokens();
      return {
        available: !!access,
        hasRefreshToken: !!refresh
      };
    } catch (error) {
      return { available: false, hasRefreshToken: false };
    }
  }, [getStoredTokens]);

  const validateCredentials = useCallback(async (email: string, password: string): Promise<{ valid: boolean; error?: AuthError }> => {
    try {
      const result = await cognitoService.verifyCredentials({ email, password });
      
      if (result.success) {
        return { valid: true };
      }
      
      return {
        valid: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: result.error || 'invalid credentials',
          retryable: false,
          context: 'validateCredentials'
        }
      };
    } catch (error: any) {
      return {
        valid: false,
        error: handleAuthError(error, 'validateCredentials')
      };
    }
  }, [cognitoService, handleAuthError]);

  return {
    handleAuthError,
    validateCurrentSession,
    checkTokensAvailability,
    validateCredentials,
  };
};
