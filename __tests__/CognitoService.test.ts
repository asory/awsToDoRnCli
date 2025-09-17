import { CognitoService } from '../src/infrastructure/services/CognitoService';

// Mock aws-amplify/auth
jest.mock('aws-amplify/auth', () => ({
  signIn: jest.fn(),
  signUp: jest.fn(),
  confirmSignUp: jest.fn(),
  signOut: jest.fn(),
  fetchAuthSession: jest.fn(),
  getCurrentUser: jest.fn(),
  resendSignUpCode: jest.fn(),
  resetPassword: jest.fn(),
  confirmResetPassword: jest.fn(),
  updatePassword: jest.fn(),
}));

// Mock SecureStorage
jest.mock('../src/infrastructure/storage/SecureStorage', () => ({
  SecureStorage: {
    storeToken: jest.fn(),
    getToken: jest.fn(),
    isTokenExpiringSoon: jest.fn(),
    clearAll: jest.fn(),
  },
}));

// Mock ScopeUtils
jest.mock('../src/shared/utils/ScopeUtils', () => ({
  ScopeUtils: {
    extractScopesFromToken: jest.fn(),
  },
}));

const mockAuth = require('aws-amplify/auth');
const mockSecureStorage = require('../src/infrastructure/storage/SecureStorage').SecureStorage;
const mockScopeUtils = require('../src/shared/utils/ScopeUtils').ScopeUtils;

describe('CognitoService', () => {
  let cognitoService: CognitoService;

  beforeEach(() => {
    jest.clearAllMocks();
    cognitoService = new CognitoService();
  });

  describe('extractTokens', () => {
    test('should extract tokens correctly from valid session', () => {
      const futureTime = Date.now() + 3600000; // 1 hour from now
      const mockSession = {
        tokens: {
          accessToken: {
            toString: () => 'mock-access-token',
            payload: { exp: futureTime / 1000 },
          },
          refreshToken: {
            toString: () => 'mock-refresh-token',
          },
          idToken: {
            toString: () => 'mock-id-token',
          },
        },
      };

      mockScopeUtils.extractScopesFromToken.mockReturnValue(['read', 'write']);

      const result = (cognitoService as any).extractTokens(mockSession);

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        idToken: 'mock-id-token',
        expiresIn: futureTime,
        tokenType: 'Bearer',
        scopes: ['read', 'write'],
      });
    });

    test('should throw error for invalid session', () => {
      const mockSession = { tokens: null };

      expect(() => (cognitoService as any).extractTokens(mockSession)).toThrow('Invalid session: No tokens available');
    });

    test('should throw error for missing required tokens', () => {
      const mockSession = {
        tokens: {
          accessToken: null,
          idToken: null,
        },
      };

      expect(() => (cognitoService as any).extractTokens(mockSession)).toThrow('Invalid session: Missing required tokens');
    });

    test('should throw error for expired token', () => {
      const pastTime = Date.now() - 1000;
      const mockSession = {
        tokens: {
          accessToken: {
            toString: () => 'mock-access-token',
            payload: { exp: pastTime / 1000 },
          },
          idToken: {
            toString: () => 'mock-id-token',
          },
        },
      };

      expect(() => (cognitoService as any).extractTokens(mockSession)).toThrow('Token has expired');
    });
  });

  describe('shouldRefreshToken', () => {
    test('should return false when no access token', async () => {
      mockSecureStorage.getToken.mockResolvedValue(null);

      const result = await cognitoService.shouldRefreshToken();

      expect(result).toBe(false);
      expect(mockSecureStorage.getToken).toHaveBeenCalledWith('access');
    });

    test('should return true when token is expiring soon', async () => {
      mockSecureStorage.getToken.mockResolvedValue('mock-token');
      mockSecureStorage.isTokenExpiringSoon.mockReturnValue(true);

      const result = await cognitoService.shouldRefreshToken();

      expect(result).toBe(true);
      expect(mockSecureStorage.isTokenExpiringSoon).toHaveBeenCalledWith('mock-token', 5);
    });

    test('should return false when token is not expiring soon', async () => {
      mockSecureStorage.getToken.mockResolvedValue('mock-token');
      mockSecureStorage.isTokenExpiringSoon.mockReturnValue(false);

      const result = await cognitoService.shouldRefreshToken();

      expect(result).toBe(false);
    });
  });

  describe('refreshTokenIfNeeded', () => {
    test('should return null when refresh not needed', async () => {
      mockSecureStorage.getToken.mockResolvedValue('mock-token');
      mockSecureStorage.isTokenExpiringSoon.mockReturnValue(false);

      const result = await cognitoService.refreshTokenIfNeeded();

      expect(result).toBe(null);
    });

    test('should return null when no refresh token available', async () => {
      mockSecureStorage.getToken
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce(null); // No refresh token
      mockSecureStorage.isTokenExpiringSoon.mockReturnValue(true);

      const result = await cognitoService.refreshTokenIfNeeded();

      expect(result).toBe(null);
    });

    test('should refresh tokens successfully', async () => {
      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        idToken: 'new-id-token',
        expiresIn: Date.now() + 3600000,
        tokenType: 'Bearer',
        scopes: ['read'],
      };

      mockSecureStorage.getToken
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce('mock-refresh-token');
      mockSecureStorage.isTokenExpiringSoon.mockReturnValue(true);
      mockAuth.fetchAuthSession.mockResolvedValue({
        tokens: {
          accessToken: { toString: () => newTokens.accessToken, payload: { exp: newTokens.expiresIn / 1000 } },
          refreshToken: { toString: () => newTokens.refreshToken },
          idToken: { toString: () => newTokens.idToken },
        },
      });
      mockScopeUtils.extractScopesFromToken.mockReturnValue(newTokens.scopes);
      mockSecureStorage.storeToken.mockResolvedValue(undefined);

      const result = await cognitoService.refreshTokenIfNeeded();

      expect(result).toEqual(newTokens);
      expect(mockSecureStorage.storeToken).toHaveBeenCalledTimes(2);
    });

    test('should return null on refresh failure', async () => {
      mockSecureStorage.getToken
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce('mock-refresh-token');
      mockSecureStorage.isTokenExpiringSoon.mockReturnValue(true);
      mockAuth.fetchAuthSession.mockRejectedValue(new Error('Refresh failed'));

      const result = await cognitoService.refreshTokenIfNeeded();

      expect(result).toBe(null);
    });
  });

  describe('getAuthTokens', () => {
    test('should return extracted tokens from session', async () => {
      const mockSession = {
        tokens: {
          accessToken: {
            toString: () => 'mock-access-token',
            payload: { exp: (Date.now() + 3600000) / 1000 },
          },
          refreshToken: {
            toString: () => 'mock-refresh-token',
          },
          idToken: {
            toString: () => 'mock-id-token',
          },
        },
      };

      mockAuth.fetchAuthSession.mockResolvedValue(mockSession);
      mockScopeUtils.extractScopesFromToken.mockReturnValue(['read']);

      const result = await cognitoService.getAuthTokens();

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        idToken: 'mock-id-token',
        expiresIn: expect.any(Number),
        tokenType: 'Bearer',
        scopes: ['read'],
      });
    });

    test('should return null when no session tokens', async () => {
      mockAuth.fetchAuthSession.mockResolvedValue({ tokens: null });

      const result = await cognitoService.getAuthTokens();

      expect(result).toBe(null);
    });
  });
});