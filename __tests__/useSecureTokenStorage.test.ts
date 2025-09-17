import { renderHook, act } from '@testing-library/react-native';
import { useSecureTokenStorage } from '../src/presentation/hooks/useSecureTokenStorage';

// Mock SecureStorage
jest.mock('../src/infrastructure/storage/SecureStorage', () => ({
  SecureStorage: {
    storeToken: jest.fn(),
    getToken: jest.fn(),
    validateToken: jest.fn(),
    clearAll: jest.fn(),
    cleanupExpiredTokens: jest.fn(),
  },
}));

const mockSecureStorage = require('../src/infrastructure/storage/SecureStorage').SecureStorage;

describe('useSecureTokenStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('storeTokens should store access and refresh tokens', async () => {
    const { result } = renderHook(() => useSecureTokenStorage());

    const mockTokens = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      idToken: 'mock-id-token',
      expiresIn: Date.now() + 3600000,
      tokenType: 'Bearer',
      scopes: ['read'],
    };

    mockSecureStorage.storeToken.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.storeTokens(mockTokens);
    });

    expect(mockSecureStorage.storeToken).toHaveBeenCalledWith(
      'access',
      mockTokens.accessToken,
      expect.any(Number)
    );
    expect(mockSecureStorage.storeToken).toHaveBeenCalledWith(
      'refresh',
      mockTokens.refreshToken
    );
  });

  test('storeTokens should handle tokens without refresh token', async () => {
    const { result } = renderHook(() => useSecureTokenStorage());

    const mockTokens = {
      accessToken: 'mock-access-token',
      refreshToken: '',
      idToken: 'mock-id-token',
      expiresIn: Date.now() + 3600000,
      tokenType: 'Bearer',
      scopes: ['read'],
    };

    mockSecureStorage.storeToken.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.storeTokens(mockTokens);
    });

    expect(mockSecureStorage.storeToken).toHaveBeenCalledTimes(1); // Only access token
    expect(mockSecureStorage.storeToken).toHaveBeenCalledWith(
      'access',
      mockTokens.accessToken,
      expect.any(Number)
    );
  });

  test('getStoredTokens should return stored tokens', async () => {
    const { result } = renderHook(() => useSecureTokenStorage());

    mockSecureStorage.getToken
      .mockResolvedValueOnce('mock-access-token')
      .mockResolvedValueOnce('mock-refresh-token');

    let storedTokens;
    await act(async () => {
      storedTokens = await result.current.getStoredTokens();
    });

    expect(storedTokens).toEqual({
      access: 'mock-access-token',
      refresh: 'mock-refresh-token',
    });
    expect(mockSecureStorage.getToken).toHaveBeenCalledWith('access');
    expect(mockSecureStorage.getToken).toHaveBeenCalledWith('refresh');
  });

  test('getStoredTokens should handle errors gracefully', async () => {
    const { result } = renderHook(() => useSecureTokenStorage());

    mockSecureStorage.getToken.mockRejectedValue(new Error('Storage error'));

    let storedTokens;
    await act(async () => {
      storedTokens = await result.current.getStoredTokens();
    });

    expect(storedTokens).toEqual({
      access: null,
      refresh: null,
    });
  });

  test('validateStoredTokens should return true for valid token', async () => {
    const { result } = renderHook(() => useSecureTokenStorage());

    mockSecureStorage.getToken.mockResolvedValue('mock-access-token');
    mockSecureStorage.validateToken.mockResolvedValue(true);

    let isValid;
    await act(async () => {
      isValid = await result.current.validateStoredTokens();
    });

    expect(isValid).toBe(true);
    expect(mockSecureStorage.validateToken).toHaveBeenCalledWith('mock-access-token');
  });

  test('validateStoredTokens should return false when no access token', async () => {
    const { result } = renderHook(() => useSecureTokenStorage());

    mockSecureStorage.getToken.mockResolvedValue(null);

    let isValid;
    await act(async () => {
      isValid = await result.current.validateStoredTokens();
    });

    expect(isValid).toBe(false);
    expect(mockSecureStorage.validateToken).not.toHaveBeenCalled();
  });

  test('validateStoredTokens should return false on validation error', async () => {
    const { result } = renderHook(() => useSecureTokenStorage());

    mockSecureStorage.getToken.mockResolvedValue('mock-access-token');
    mockSecureStorage.validateToken.mockRejectedValue(new Error('Validation error'));

    let isValid;
    await act(async () => {
      isValid = await result.current.validateStoredTokens();
    });

    expect(isValid).toBe(false);
  });

  test('clearTokens should call SecureStorage.clearAll', async () => {
    const { result } = renderHook(() => useSecureTokenStorage());

    mockSecureStorage.clearAll.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.clearTokens();
    });

    expect(mockSecureStorage.clearAll).toHaveBeenCalled();
  });

  test('clearTokens should handle errors', async () => {
    const { result } = renderHook(() => useSecureTokenStorage());

    mockSecureStorage.clearAll.mockRejectedValue(new Error('Clear error'));

    await expect(act(async () => {
      await result.current.clearTokens();
    })).rejects.toThrow('Clear error');
  });

  test('cleanupExpiredTokens should call SecureStorage.cleanupExpiredTokens', async () => {
    const { result } = renderHook(() => useSecureTokenStorage());

    mockSecureStorage.cleanupExpiredTokens.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.cleanupExpiredTokens();
    });

    expect(mockSecureStorage.cleanupExpiredTokens).toHaveBeenCalled();
  });

  test('cleanupExpiredTokens should not throw on error', async () => {
    const { result } = renderHook(() => useSecureTokenStorage());

    mockSecureStorage.cleanupExpiredTokens.mockRejectedValue(new Error('Cleanup error'));

    await act(async () => {
      await result.current.cleanupExpiredTokens();
    });

    // Should not throw, just log error
    expect(mockSecureStorage.cleanupExpiredTokens).toHaveBeenCalled();
  });
});