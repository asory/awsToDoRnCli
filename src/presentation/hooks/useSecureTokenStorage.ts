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
      return { access: null, refresh: null };
    }
  }, []);

  const validateStoredTokens = useCallback(async (): Promise<boolean> => {
    try {
      const { access } = await getStoredTokens();
      if (!access) return false;
      
      return await SecureStorage.validateToken(access);
    } catch (error) {
      return false;
    }
  }, [getStoredTokens]);

  const clearTokens = useCallback(async (): Promise<void> => {
    try {
      await SecureStorage.clearAll();
    } catch (error) {
      throw error;
    }
  }, []);

  const cleanupExpiredTokens = useCallback(async (): Promise<void> => {
    try {
      await SecureStorage.cleanupExpiredTokens();
    } catch (error) {
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
