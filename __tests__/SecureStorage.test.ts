import { SecureStorage } from '../src/infrastructure/storage/SecureStorage';

// Mock atob for JWT decoding
global.atob = (str: string) => Buffer.from(str, 'base64').toString('utf-8');

// Mock dependencies
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
  ACCESS_CONTROL: {
    BIOMETRY_ANY_OR_DEVICE_PASSCODE: 'BIOMETRY_ANY_OR_DEVICE_PASSCODE',
    BIOMETRY_ANY: 'BIOMETRY_ANY',
  },
  ACCESSIBLE: {
    WHEN_UNLOCKED: 'WHEN_UNLOCKED',
  },
  SECURITY_LEVEL: {
    SECURE_HARDWARE: 'SECURE_HARDWARE',
  },
}));

jest.mock('react-native-encrypted-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

const mockKeychain = require('react-native-keychain');
const mockEncryptedStorage = require('react-native-encrypted-storage');

describe('SecureStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Token Validation and Parsing', () => {
    test('validateToken should return true for valid JWT token', async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ exp: futureTime, iat: Date.now() / 1000 }));
      const signature = 'signature';
      const token = `${header}.${payload}.${signature}`;

      const result = await SecureStorage.validateToken(token);
      expect(result).toBe(true);
    });

    test('validateToken should return false for expired JWT token', async () => {
      const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ exp: pastTime, iat: Date.now() / 1000 }));
      const signature = 'signature';
      const token = `${header}.${payload}.${signature}`;

      const result = await SecureStorage.validateToken(token);
      expect(result).toBe(false);
    });

    test('validateToken should return false for invalid JWT format', async () => {
      const invalidToken = 'invalid.token';
      const result = await SecureStorage.validateToken(invalidToken);
      expect(result).toBe(false);
    });

    test('validateToken should return false for non-string input', async () => {
      const result = await SecureStorage.validateToken(null as any);
      expect(result).toBe(false);
    });

    test('getTokenExpirationTime should return correct expiration time', () => {
      const expTime = Math.floor(Date.now() / 1000) + 3600;
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ exp: expTime }));
      const signature = 'signature';
      const token = `${header}.${payload}.${signature}`;

      const result = SecureStorage.getTokenExpirationTime(token);
      expect(result).toBe(expTime * 1000); // Should be in milliseconds
    });

    test('getTokenExpirationTime should return null for invalid token', () => {
      const result = SecureStorage.getTokenExpirationTime('invalid');
      expect(result).toBe(null);
    });

    test('isTokenExpiringSoon should return true when token expires within threshold', () => {
      const thresholdMinutes = 5;
      const expTime = Math.floor(Date.now() / 1000) + (thresholdMinutes * 60) - 30; // 30 seconds before threshold
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ exp: expTime }));
      const signature = 'signature';
      const token = `${header}.${payload}.${signature}`;

      const result = SecureStorage.isTokenExpiringSoon(token, thresholdMinutes);
      expect(result).toBe(true);
    });

    test('isTokenExpiringSoon should return false when token expires after threshold', () => {
      const thresholdMinutes = 5;
      const expTime = Math.floor(Date.now() / 1000) + (thresholdMinutes * 60) + 60; // 1 minute after threshold
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ exp: expTime }));
      const signature = 'signature';
      const token = `${header}.${payload}.${signature}`;

      const result = SecureStorage.isTokenExpiringSoon(token, thresholdMinutes);
      expect(result).toBe(false);
    });
  });

  describe('Token Storage Operations', () => {
    test('storeToken should store access token with expiration', async () => {
      const token = 'test-access-token';
      const expiresIn = 3600; // 1 hour

      mockKeychain.setGenericPassword.mockResolvedValue(true);

      await SecureStorage.storeToken('access', token, expiresIn);

      expect(mockKeychain.setGenericPassword).toHaveBeenCalledWith(
        'awsToDoRN_tokens_accessToken',
        JSON.stringify({ token, expiresAt: 4600000 }),
        expect.any(Object)
      );
    });

    test('storeToken should store refresh token without expiration', async () => {
      const token = 'test-refresh-token';

      mockKeychain.setGenericPassword.mockResolvedValue(true);

      await SecureStorage.storeToken('refresh', token);

      expect(mockKeychain.setGenericPassword).toHaveBeenCalledWith(
        'awsToDoRN_tokens_refreshToken',
        JSON.stringify({ token, expiresAt: 0 }),
        expect.any(Object)
      );
    });

    test('getToken should retrieve stored token', async () => {
      const token = 'test-token';
      const storedData = JSON.stringify({ token, expiresAt: 0 });

      mockKeychain.getGenericPassword.mockResolvedValue({
        username: 'awsToDoRN_tokens_accessToken',
        password: storedData,
      });

      const result = await SecureStorage.getToken('access');

      expect(result).toBe(token);
      expect(mockKeychain.getGenericPassword).toHaveBeenCalledWith({
        service: 'awsToDoRN',
      });
    });

    test('getToken should return null when no token stored', async () => {
      mockKeychain.getGenericPassword.mockResolvedValue(null);

      const result = await SecureStorage.getToken('access');

      expect(result).toBe(null);
    });

    test('getTokenWithMetadata should return token data object', async () => {
      const token = 'test-token';
      const expiresAt = Date.now() + 3600000;
      const storedData = JSON.stringify({ token, expiresAt });

      mockKeychain.getGenericPassword.mockResolvedValue({
        username: 'awsToDoRN_tokens_accessToken',
        password: storedData,
      });

      const result = await SecureStorage.getTokenWithMetadata('access');

      expect(result).toEqual({ token, expiresAt });
    });

    test('isTokenExpired should return true for expired token', async () => {
      const pastTime = Date.now() - 1000;
      const storedData = JSON.stringify({ token: 'test', expiresAt: pastTime });

      mockKeychain.getGenericPassword.mockResolvedValue({
        username: 'awsToDoRN_tokens_accessToken',
        password: storedData,
      });

      const result = await SecureStorage.isTokenExpired('access');

      expect(result).toBe(true);
    });

    test('isTokenExpired should return false for non-expiring token', async () => {
      const storedData = JSON.stringify({ token: 'test', expiresAt: 0 });

      mockKeychain.getGenericPassword.mockResolvedValue({
        username: 'awsToDoRN_tokens_accessToken',
        password: storedData,
      });

      const result = await SecureStorage.isTokenExpired('access');

      expect(result).toBe(false);
    });

    test('clearAll should clear all stored data', async () => {
      mockEncryptedStorage.clear.mockResolvedValue(undefined);
      mockKeychain.resetGenericPassword.mockResolvedValue(undefined);

      await SecureStorage.clearAll();

      expect(mockKeychain.resetGenericPassword).toHaveBeenCalled();
    });

    test('cleanupExpiredTokens should remove expired tokens', async () => {
      const pastTime = Date.now() - 1000;
      const futureTime = Date.now() + 3600000;

      // Mock access token as expired
      mockKeychain.getGenericPassword
        .mockResolvedValueOnce({
          username: 'awsToDoRN_tokens_accessToken',
          password: JSON.stringify({ token: 'expired', expiresAt: pastTime }),
        })
        .mockResolvedValueOnce({
          username: 'awsToDoRN_tokens_refreshToken',
          password: JSON.stringify({ token: 'valid', expiresAt: futureTime }),
        });

      mockKeychain.resetGenericPassword.mockResolvedValue(undefined);

      await SecureStorage.cleanupExpiredTokens();

      expect(mockKeychain.resetGenericPassword).toHaveBeenCalledTimes(1);
    });
  });

  describe('Platform-specific behavior', () => {
    test('should use EncryptedStorage for large tokens on Android', async () => {
      // Temporarily change platform
      const originalOS = require('react-native').Platform.OS;
      require('react-native').Platform.OS = 'android';

      const largeToken = 'a'.repeat(300); // > 256 bytes

      mockEncryptedStorage.setItem.mockResolvedValue(undefined);

      await SecureStorage.setSecureItem('test-key', largeToken);

      expect(mockEncryptedStorage.setItem).toHaveBeenCalledWith('test-key', largeToken);

      // Restore original platform
      require('react-native').Platform.OS = originalOS;
    });

    test('should use Keychain for small tokens on Android', async () => {
      const originalOS = require('react-native').Platform.OS;
      require('react-native').Platform.OS = 'android';

      const smallToken = 'small-token';

      mockKeychain.setGenericPassword.mockResolvedValue(true);

      await SecureStorage.setSecureItem('test-key', smallToken);

      expect(mockKeychain.setGenericPassword).toHaveBeenCalled();

      require('react-native').Platform.OS = originalOS;
    });
  });
});