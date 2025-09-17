import { useCallback } from 'react';
import { SecureStorage } from '../../infrastructure/storage/SecureStorage';
import { AuthTokens } from '../../core/entities/User';

export const useSecureTokenStorage = () => {
  const storeTokens = useCallback(async (tokens: AuthTokens): Promise<void> => {
    try {
      await SecureStorage.storeToken(
        'access', 
        tokens.accessToken, 
        tokens.expiresIn ? (tokens.expiresIn - Date.now()) / 1000 : undefined
      );
      
      if (tokens.refreshToken) {
        await SecureStorage.storeToken('refresh', tokens.refreshToken);
      }
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw error;
    }
  }, []);

  const getStoredTokens = useCallback(async (): Promise<{ access: string | null; refresh: string | null }> => {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        SecureStorage.getToken('access'),
        SecureStorage.getToken('refresh')
      ]);
      
      return { access: accessToken, refresh: refreshToken };
    } catch (error) {
      console.error('Error retrieving tokens:', error);
      return { access: null, refresh: null };
    }
  }, []);

  const validateStoredTokens = useCallback(async (): Promise<boolean> => {
    try {
      const { access } = await getStoredTokens();
      if (!access) return false;
      
      return await SecureStorage.validateToken(access);
    } catch (error) {
      console.error('Error validating stored tokens:', error);
      return false;
    }
  }, [getStoredTokens]);

  const clearTokens = useCallback(async (): Promise<void> => {
    try {
      await SecureStorage.clearAll();
    } catch (error) {
      console.error('Error clearing tokens:', error);
      throw error;
    }
  }, []);

  const cleanupExpiredTokens = useCallback(async (): Promise<void> => {
    try {
      await SecureStorage.cleanupExpiredTokens();
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
    }
  }, []);

  return {
    storeTokens,
    getStoredTokens,
    validateStoredTokens,
    clearTokens,
    cleanupExpiredTokens,
  };
};
