import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';

interface TokenData {
  token: string;
  expiresAt: number;
}

// Android keychain has a 256 byte limit, so we need to chunk large values
const ANDROID_CHUNK_SIZE = 200; // Leave some buffer

export class SecureStorage {
  private static readonly TOKEN_NAMESPACE = 'awsToDoRN_tokens';
  private static readonly ACCESS_TOKEN_KEY = `${SecureStorage.TOKEN_NAMESPACE}_accessToken`;
  private static readonly REFRESH_TOKEN_KEY = `${SecureStorage.TOKEN_NAMESPACE}_refreshToken`;
  private static readonly TOKEN_METADATA_KEY = `${SecureStorage.TOKEN_NAMESPACE}_metadata`;

  /**
   * Store large tokens using EncryptedStorage on Android (no size limit)
   */
  private static async setLargeAndroidItem(key: string, value: string): Promise<void> {
    await EncryptedStorage.setItem(key, value);
  }

  /**
   * Retrieve large tokens from EncryptedStorage on Android
   */
  private static async getLargeAndroidItem(key: string): Promise<string | null> {
    try {
      const result = await EncryptedStorage.getItem(key);
      return result;
    } catch (error) {
      console.error('Error retrieving large Android item:', error);
      return null;
    }
  }

  static async setSecureItem(key: string, value: string): Promise<void> {
    try {
      const isTokenKey = key.includes('_accessToken') || key.includes('_refreshToken');

      if (Platform.OS === 'android' && value.length > ANDROID_CHUNK_SIZE) {
        await this.setLargeAndroidItem(key, value);
      } else {
        // Normal storage for iOS or small values
        const options: Keychain.Options = {
          service: 'awsToDoRN',
          // For tokens, require biometric authentication on iOS and user authentication on Android
          accessControl: isTokenKey ? Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE : Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
          // Make tokens accessible only when device is unlocked
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
          // Use hardware-backed storage when available
          securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
        };

        await Keychain.setGenericPassword(key, value, options);
      }
    } catch (error) {
      console.error('Secure storage set error:', error);
      throw error;
    }
  }

  static async getSecureItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'android') {
        const encryptedResult = await this.getLargeAndroidItem(key);
        if (encryptedResult) {
          return encryptedResult;
        }
      }

      const credentials = await Keychain.getGenericPassword({
        service: 'awsToDoRN',
      });

      if (credentials && credentials.username === key) {
        return credentials.password;
      }

      return null;
    } catch (error) {
      console.error('Secure storage get error:', error);
      return null;
    }
  }

  static async removeSecureItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        try {
          await EncryptedStorage.removeItem(key);
        } catch (error) {
          // Item might not exist in EncryptedStorage, continue
        }
      }

      await Keychain.resetGenericPassword({
        service: 'awsToDoRN',
      });
      // Note: react-native-keychain resets all items for the service
      // For individual key removal, we reset the entire service
      // This is a limitation of the current implementation
    } catch (error) {
      console.error('Secure storage remove error:', error);
      throw error;
    }
  }

  static async clearAll(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        await EncryptedStorage.clear();
      }

      await Keychain.resetGenericPassword();
    } catch (error) {
      console.error('Secure storage clear error:', error);
      throw error;
    }
  }

  // Alternative method for storing multiple items
  static async setMultipleSecureItems(items: Record<string, string>): Promise<void> {
    try {
      for (const [key, value] of Object.entries(items)) {
        await this.setSecureItem(key, value);
      }
    } catch (error) {
      console.error('Secure storage set multiple error:', error);
      throw error;
    }
  }

  static async getMultipleSecureItems(keys: string[]): Promise<Record<string, string | null>> {
    try {
      const result: Record<string, string | null> = {};

      for (const key of keys) {
        result[key] = await this.getSecureItem(key);
      }

      return result;
    } catch (error) {
      console.error('Secure storage get multiple error:', error);
      throw error;
    }
  }

  // Token-specific methods for enhanced refresh token management

  static async storeToken(tokenType: 'access' | 'refresh', token: string, expiresIn?: number): Promise<void> {
    try {
      const key = tokenType === 'access' ? this.ACCESS_TOKEN_KEY : this.REFRESH_TOKEN_KEY;
      const expiresAt = expiresIn ? Date.now() + (expiresIn * 1000) : 0;

      const tokenData: TokenData = {
        token,
        expiresAt,
      };

      await this.setSecureItem(key, JSON.stringify(tokenData));
    } catch (error) {
      console.error(`Secure storage store ${tokenType} token error:`, error);
      throw error;
    }
  }

  static async getToken(tokenType: 'access' | 'refresh'): Promise<string | null> {
    try {
      const key = tokenType === 'access' ? this.ACCESS_TOKEN_KEY : this.REFRESH_TOKEN_KEY;
      const data = await this.getSecureItem(key);

      if (!data) return null;

      const tokenData: TokenData = JSON.parse(data);
      return tokenData.token;
    } catch (error) {
      console.error(`Secure storage get ${tokenType} token error:`, error);
      return null;
    }
  }

  static async getTokenWithMetadata(tokenType: 'access' | 'refresh'): Promise<TokenData | null> {
    try {
      const key = tokenType === 'access' ? this.ACCESS_TOKEN_KEY : this.REFRESH_TOKEN_KEY;
      const data = await this.getSecureItem(key);

      if (!data) return null;

      return JSON.parse(data) as TokenData;
    } catch (error) {
      console.error(`Secure storage get ${tokenType} token with metadata error:`, error);
      return null;
    }
  }

  static async validateToken(token: string): Promise<boolean> {
    try {
      if (!token || typeof token !== 'string') return false;

      // Basic JWT format validation (header.payload.signature)
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      // Decode payload to check expiration
      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Math.floor(Date.now() / 1000);

      if (payload.exp && payload.exp < currentTime) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  static getTokenExpirationTime(token: string): number | null {
    try {
      if (!token || typeof token !== 'string') return null;

      // Basic JWT format validation (header.payload.signature)
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      // Decode payload to get expiration time
      const payload = JSON.parse(atob(parts[1]));
      return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
    } catch (error) {
      console.error('Error getting token expiration time:', error);
      return null;
    }
  }

  static isTokenExpiringSoon(token: string, thresholdMinutes: number = 5): boolean {
    try {
      const expirationTime = this.getTokenExpirationTime(token);
      if (!expirationTime) return false;

      const currentTime = Date.now();
      const thresholdTime = currentTime + (thresholdMinutes * 60 * 1000);

      return expirationTime <= thresholdTime;
    } catch (error) {
      console.error('Error checking if token is expiring soon:', error);
      return false;
    }
  }

  static async isTokenExpired(tokenType: 'access' | 'refresh'): Promise<boolean> {
    try {
      const tokenData = await this.getTokenWithMetadata(tokenType);
      if (!tokenData) return true;

      if (tokenData.expiresAt === 0) return false; // No expiration set

      return Date.now() >= tokenData.expiresAt;
    } catch (error) {
      console.error(`Token expiration check error for ${tokenType}:`, error);
      return true;
    }
  }

  static async cleanupExpiredTokens(): Promise<void> {
    try {
      const tokenTypes: ('access' | 'refresh')[] = ['access', 'refresh'];

      for (const tokenType of tokenTypes) {
        const isExpired = await this.isTokenExpired(tokenType);
        if (isExpired) {
          const key = tokenType === 'access' ? this.ACCESS_TOKEN_KEY : this.REFRESH_TOKEN_KEY;
          await this.removeSecureItem(key);
          console.log(`${tokenType} token cleaned up due to expiration`);
        }
      }
    } catch (error) {
      console.error('Token cleanup error:', error);
      throw error;
    }
  }

  static async removeToken(tokenType: 'access' | 'refresh'): Promise<void> {
    try {
      const key = tokenType === 'access' ? this.ACCESS_TOKEN_KEY : this.REFRESH_TOKEN_KEY;
      await this.removeSecureItem(key);
    } catch (error) {
      console.error(`Secure storage remove ${tokenType} token error:`, error);
      throw error;
    }
  }

  // Re-authentication specific methods
  private static readonly REAUTH_TIMESTAMP_KEY = `${SecureStorage.TOKEN_NAMESPACE}_reAuthTimestamp`;
  private static readonly BIOMETRIC_KEY_KEY = `${SecureStorage.TOKEN_NAMESPACE}_biometricKey`;
  private static readonly PIN_KEY = `${SecureStorage.TOKEN_NAMESPACE}_pin`;

  static async storeReAuthTimestamp(timestamp: string): Promise<void> {
    try {
      await this.setSecureItem(this.REAUTH_TIMESTAMP_KEY, timestamp);
    } catch (error) {
      console.error('Secure storage store re-auth timestamp error:', error);
      throw error;
    }
  }

  static async getReAuthTimestamp(): Promise<string | null> {
    try {
      return await this.getSecureItem(this.REAUTH_TIMESTAMP_KEY);
    } catch (error) {
      console.error('Secure storage get re-auth timestamp error:', error);
      return null;
    }
  }

  static async clearReAuthTimestamp(): Promise<void> {
    try {
      await this.removeSecureItem(this.REAUTH_TIMESTAMP_KEY);
    } catch (error) {
      console.error('Secure storage clear re-auth timestamp error:', error);
      throw error;
    }
  }

  static async storeBiometricKey(publicKey: string): Promise<void> {
    try {
      await this.setSecureItem(this.BIOMETRIC_KEY_KEY, publicKey);
    } catch (error) {
      console.error('Secure storage store biometric key error:', error);
      throw error;
    }
  }

  static async getBiometricKey(): Promise<string | null> {
    try {
      return await this.getSecureItem(this.BIOMETRIC_KEY_KEY);
    } catch (error) {
      console.error('Secure storage get biometric key error:', error);
      return null;
    }
  }

  static async clearBiometricKey(): Promise<void> {
    try {
      await this.removeSecureItem(this.BIOMETRIC_KEY_KEY);
    } catch (error) {
      console.error('Secure storage clear biometric key error:', error);
      throw error;
    }
  }

  static async storePIN(pin: string): Promise<void> {
    try {
      await this.setSecureItem(this.PIN_KEY, pin);
    } catch (error) {
      console.error('Secure storage store PIN error:', error);
      throw error;
    }
  }

  static async getPIN(): Promise<string | null> {
    try {
      return await this.getSecureItem(this.PIN_KEY);
    } catch (error) {
      console.error('Secure storage get PIN error:', error);
      return null;
    }
  }

  static async clearPIN(): Promise<void> {
    try {
      await this.removeSecureItem(this.PIN_KEY);
    } catch (error) {
      console.error('Secure storage clear PIN error:', error);
      throw error;
    }
  }
}