import ReactNativeBiometrics from 'react-native-biometrics';
import { Platform } from 'react-native';
import { SecureStorage } from '../storage/SecureStorage';

export interface ReAuthResult {
  success: boolean;
  method: 'biometric' | 'pin' | 'none';
  error?: string;
}

export interface BiometricConfig {
  promptMessage: string;
  cancelButtonText: string;
  allowDeviceCredentials?: boolean;
}

export class BiometricService {
  private static instance: BiometricService;
  private biometrics: typeof ReactNativeBiometrics;

  private constructor() {
    this.biometrics = ReactNativeBiometrics;
  }

  static getInstance(): BiometricService {
    if (!BiometricService.instance) {
      BiometricService.instance = new BiometricService();
    }
    return BiometricService.instance;
  }

  /**
   * Check if biometric authentication is available on the device
   */
  async isBiometricAvailable(): Promise<{ available: boolean; biometryType?: string; error?: string }> {
    try {
      const result = await (ReactNativeBiometrics as any).isSensorAvailable();
      return {
        available: result.available,
        biometryType: result.biometryType,
      };
    } catch (error: any) {
      console.error('Biometric availability check failed:', error);
      return {
        available: false,
        error: error.message || 'Biometric check failed',
      };
    }
  }

  /**
   * Create biometric keys for the user
   */
  async createBiometricKeys(): Promise<{ success: boolean; publicKey?: string; error?: string }> {
    try {
      const result = await (this.biometrics as any).createKeys();
      if (result.publicKey) {
        // Store the public key securely
        await SecureStorage.storeBiometricKey(result.publicKey);
        return { success: true, publicKey: result.publicKey };
      } else {
        return { success: false, error: 'Failed to create biometric keys' };
      }
    } catch (error: any) {
      console.error('Biometric key creation failed:', error);
      return { success: false, error: error.message || 'Key creation failed' };
    }
  }

  /**
   * Perform biometric authentication
   */
  async authenticateWithBiometrics(config: BiometricConfig): Promise<ReAuthResult> {
    try {
      const { promptMessage, cancelButtonText, allowDeviceCredentials = true } = config;

      const result = await (this.biometrics as any).simplePrompt({
        promptMessage,
        cancelButtonText,
        allowDeviceCredentials,
      });

      if (result.success) {
        // Update re-auth timestamp
        await this.updateReAuthTimestamp();
        return { success: true, method: 'biometric' };
      } else {
        return { success: false, method: 'biometric', error: result.error || 'Biometric authentication failed' };
      }
    } catch (error: any) {
      console.error('Biometric authentication failed:', error);
      return { success: false, method: 'biometric', error: error.message || 'Biometric authentication error' };
    }
  }


  /**
   * Set a PIN for re-authentication
   */
  async setPIN(pin: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!pin || pin.length < 4) {
        return { success: false, error: 'PIN must be at least 4 characters' };
      }
      await SecureStorage.storePIN(pin);
      return { success: true };
    } catch (error: any) {
      console.error('Set PIN error:', error);
      return { success: false, error: error.message || 'Failed to set PIN' };
    }
  }

  /**
   * Authenticate with PIN
   */
  async authenticateWithPIN(pin: string): Promise<ReAuthResult> {
    try {
      const storedPIN = await SecureStorage.getPIN();
      if (!storedPIN) {
        return { success: false, method: 'pin', error: 'PIN not set' };
      }

      if (storedPIN === pin) {
        // Update re-auth timestamp
        await this.updateReAuthTimestamp();
        return { success: true, method: 'pin' };
      } else {
        return { success: false, method: 'pin', error: 'Invalid PIN' };
      }
    } catch (error: any) {
      console.error('PIN authentication error:', error);
      return { success: false, method: 'pin', error: error.message || 'PIN authentication failed' };
    }
  }

  /**
    * Perform re-authentication using biometric verification with device PIN fallback
    */
    async performReAuthentication(): Promise<ReAuthResult> {
      // Check if re-auth is still valid
      const isValid = await this.isReAuthValid();
      if (isValid) {
        return { success: true, method: 'none' };
      }

      // Check biometric availability
      const biometricCheck = await this.isBiometricAvailable();

      // On iOS, use biometrics with PIN fallback
      if (Platform.OS === 'ios' || biometricCheck.available) {
        const biometricResult = await this.authenticateWithBiometrics({
          promptMessage: 'Confirm your identity to access sensitive information',
          cancelButtonText: 'Cancel',
          allowDeviceCredentials: true,
        });
        return biometricResult;
      }

      // On Android without biometrics, use PIN
      // For now, assume PIN is set; in a real app, prompt to set if not
      const storedPIN = await SecureStorage.getPIN();
      if (!storedPIN) {
        return { success: false, method: 'pin', error: 'PIN not configured' };
      }

      // This will be handled in the UI, so return a special result
      return { success: false, method: 'pin', error: 'PIN required' };
    }

  /**
   * Check if current re-authentication session is still valid
   */
  async isReAuthValid(): Promise<boolean> {
    try {
      const timestamp = await SecureStorage.getReAuthTimestamp();
      if (!timestamp) return false;

      const now = Date.now();
      const timeDiff = now - parseInt(timestamp);
      const sessionDuration = 15 * 60 * 1000; // 15 minutes

      return timeDiff < sessionDuration;
    } catch (error) {
      console.error('Re-auth validation check failed:', error);
      return false;
    }
  }

  /**
   * Update the re-authentication timestamp
   */
  private async updateReAuthTimestamp(): Promise<void> {
    try {
      const timestamp = Date.now().toString();
      await SecureStorage.storeReAuthTimestamp(timestamp);
    } catch (error) {
      console.error('Failed to update re-auth timestamp:', error);
    }
  }

  /**
   * Clear re-authentication state (logout or session expiry)
   */
  async clearReAuthState(): Promise<void> {
    try {
      await SecureStorage.clearReAuthTimestamp();
    } catch (error) {
      console.error('Failed to clear re-auth state:', error);
    }
  }

  /**
   * Get remaining time for current re-auth session
   */
  async getReAuthTimeRemaining(): Promise<number> {
    try {
      const timestamp = await SecureStorage.getReAuthTimestamp();
      if (!timestamp) return 0;

      const now = Date.now();
      const timeDiff = now - parseInt(timestamp);
      const sessionDuration = 15 * 60 * 1000; // 15 minutes

      return Math.max(0, sessionDuration - timeDiff);
    } catch (error) {
      console.error('Failed to get re-auth time remaining:', error);
      return 0;
    }
  }
}

export const reAuthService = BiometricService.getInstance();