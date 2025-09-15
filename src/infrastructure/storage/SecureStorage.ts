import * as Keychain from 'react-native-keychain';

export class SecureStorage {
  private static readonly ACCESS_TOKEN_KEY = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';

  static async setSecureItem(key: string, value: string): Promise<void> {
    try {
      await Keychain.setGenericPassword(key, value, {
        service: 'awsToDoRN',
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
      });
    } catch (error) {
      console.error('Secure storage set error:', error);
      throw error;
    }
  }

  static async getSecureItem(key: string): Promise<string | null> {
    try {
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
      await Keychain.resetGenericPassword({
        service: 'awsToDoRN',
      });
    } catch (error) {
      console.error('Secure storage remove error:', error);
      throw error;
    }
  }

  static async clearAll(): Promise<void> {
    try {
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
}