import * as Keychain from 'react-native-keychain';
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

  static getInstance(): BiometricService {
    if (!BiometricService.instance) {
      BiometricService.instance = new BiometricService();
    }
    return BiometricService.instance;
  }

  /**
   * Check if biometric authentication is available using Keychain
   */
  async isBiometricAvailable(): Promise<{ available: boolean; biometryType?: string; error?: string }> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      
      return {
        available: !!biometryType,
        biometryType: biometryType || undefined,
      };
    } catch (error: any) {
      return {
        available: false,
        error: error.message || 'Biometric check failed',
      };
    }
  }


  /**
   * Authenticate with device passcode when biometry is not available
   */
  async authenticateWithDevicePasscode(config: BiometricConfig): Promise<ReAuthResult> {
    try {
      const { promptMessage } = config;
      const testService = 'device_passcode_test';

      await Keychain.setGenericPassword('passcode_user', 'passcode_pass', {
        service: testService,
        accessControl: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
      });
      
      const result = await Keychain.getGenericPassword({
        service: testService,
        authenticationPrompt: { title: promptMessage },
        authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
      });

      await Keychain.resetGenericPassword({ service: testService });

      if (result && result.username === 'passcode_user') {
        await this.updateReAuthTimestamp();
        return { success: true, method: 'biometric' };
      } else {
        return { success: false, method: 'biometric', error: 'Device passcode authentication failed' };
      }
    } catch (error: any) {
      try {
        await Keychain.resetGenericPassword({ service: 'device_passcode_test' });
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      if (error.message?.includes('Cancel') || error.message?.includes('cancel')) {
        return { success: false, method: 'biometric', error: 'User cancelled device passcode' };
      }
      
      return { success: false, method: 'biometric', error: error.message || 'Device passcode authentication failed' };
    }
  }

  /**
   * Simple iOS biometric authentication using keychain credentials
   */
  async authenticateWithBiometricsIOSSimple(config: BiometricConfig): Promise<ReAuthResult> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      
      if (!biometryType) {
        return await this.authenticateWithDevicePasscode(config);
      }
      
      const { promptMessage } = config;
      const testService = 'biometric_auth_test';

      await Keychain.setGenericPassword('auth_user', 'auth_pass', {
        service: testService,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await Keychain.getGenericPassword({
        service: testService,
        authenticationPrompt: { title: promptMessage },
      });

      await Keychain.resetGenericPassword({ service: testService });

      if (result && result.username === 'auth_user') {
        await this.updateReAuthTimestamp();
        return { success: true, method: 'biometric' };
      } else {
        return { success: false, method: 'biometric', error: 'Face ID authentication failed' };
      }
    } catch (error: any) {
      try {
        await Keychain.resetGenericPassword({ service: 'biometric_auth_test' });
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      if (error.message?.includes('Cancel') || error.message?.includes('cancel') || error.message?.includes('User cancel')) {
        return { success: false, method: 'biometric', error: 'User cancelled Face ID' };
      }
      
      return await this.authenticateWithDevicePasscode(config);
    }
  }

  /**
   * Full iOS-specific biometric authentication with fallback support
   */
  async authenticateWithBiometricsIOS(config: BiometricConfig): Promise<ReAuthResult> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      
      if (!biometryType) {
        return { success: false, method: 'biometric', error: 'Biometric authentication not available' };
      }
      
      const { promptMessage } = config;
      const testService = 'awsToDoRN_biometric_ios';
      const testUsername = 'biometric_test';
      const testPassword = 'test_value';

      await Keychain.setGenericPassword(testUsername, testPassword, {
        service: testService,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
      });

      const result = await Keychain.getGenericPassword({
        service: testService,
        authenticationPrompt: { title: promptMessage },
      });

      await Keychain.resetGenericPassword({ service: testService });

      if (result && result.username === testUsername) {
        await this.updateReAuthTimestamp();
        return { success: true, method: 'biometric' };
      } else {
        return { success: false, method: 'biometric', error: 'Biometric authentication failed' };
      }
    } catch (error: any) {
      try {
        await Keychain.resetGenericPassword({ service: 'awsToDoRN_biometric_ios' });
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      if (error.message?.includes('Cancel') || error.message?.includes('cancel')) {
        return { success: false, method: 'biometric', error: 'User cancelled authentication' };
      }

      return { success: false, method: 'biometric', error: error.message || 'Biometric authentication error' };
    }
  }

  /**
   * Perform biometric authentication using Keychain
   */
  async authenticateWithBiometrics(config: BiometricConfig): Promise<ReAuthResult> {
    if (Platform.OS === 'ios') {
      return await this.authenticateWithBiometricsIOSSimple(config);
    }

    try {
      const { promptMessage } = config;

      const testKey = `biometric_${Date.now()}`;
      const testValue = 'biometric_test';

      await Keychain.setGenericPassword(testKey, testValue, {
        service: 'awsToDoRN_biometric',
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
        authenticationPrompt: { title: promptMessage },
      });

      const result = await Keychain.getGenericPassword({
        service: 'awsToDoRN_biometric',
        authenticationPrompt: { title: promptMessage },
      });

      await Keychain.resetGenericPassword({
        service: 'awsToDoRN_biometric',
      });

      if (result && result.username === testKey) {
        await this.updateReAuthTimestamp();
        return { success: true, method: 'biometric' };
      } else {
        return { success: false, method: 'biometric', error: 'Biometric authentication failed' };
      }
    } catch (error: any) {
      try {
        await Keychain.resetGenericPassword({
          service: 'awsToDoRN_biometric',
        });
      } catch (cleanupError) {
      }

      if (error.message?.includes('Cancel') || error.message?.includes('cancel')) {
        return { success: false, method: 'biometric', error: 'User cancelled authentication' };
      }

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
        await this.updateReAuthTimestamp();
        return { success: true, method: 'pin' };
      } else {
        return { success: false, method: 'pin', error: 'Invalid PIN' };
      }
    } catch (error: any) {
      return { success: false, method: 'pin', error: error.message || 'PIN authentication failed' };
    }
  }

  /**
   * Perform re-authentication using biometric verification
   */
  async performReAuthentication(): Promise<ReAuthResult> {
    const isValid = await this.isReAuthValid();
    if (isValid) {
      return { success: true, method: 'none' };
    }

    return await this.authenticateWithBiometrics({
        promptMessage: 'Confirm your identity to access sensitive information',
        cancelButtonText: 'Cancel',
    });
  }

  /**
   * Check if current re-authentication session is still valid
   */
  async isReAuthValid(): Promise<boolean> {
    try {
      const timestamp = await SecureStorage.getReAuthTimestamp();
      if (!timestamp) return false;

      const now = Date.now();
      const timeDiff = now - parseInt(timestamp, 10);
      const sessionDuration = 15 * 60 * 1000; // 15 minutes

      return timeDiff < sessionDuration;
    } catch (error) {
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
    }
  }

  /**
   * Clear re-authentication state (logout or session expiry)
   */
  async clearReAuthState(): Promise<void> {
    try {
      await SecureStorage.clearReAuthTimestamp();
    } catch (error) {
      // Ignore clear errors
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
      const timeDiff = now - parseInt(timestamp, 10);
      const sessionDuration = 15 * 60 * 1000; // 15 minutes

      return Math.max(0, sessionDuration - timeDiff);
    } catch (error) {
      return 0;
    }
  }
}

export const reAuthService = BiometricService.getInstance();