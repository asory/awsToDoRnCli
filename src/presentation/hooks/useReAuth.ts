import { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../application/store';
import { reAuthService, ReAuthResult } from '../../infrastructure/services/BiometricService';
import { setReAuthState, clearReAuthState, setReAuthLoading, setReAuthError } from '../../application/slices/authSlice';

export interface UseReAuthReturn {
  // State
  isReAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  timeRemaining: number;
  biometricAvailable: boolean;
  biometryType: string | null;

  // Methods
  performReAuthentication: () => Promise<ReAuthResult>;
  authenticateWithBiometrics: () => Promise<ReAuthResult>;
  authenticateWithPIN: (pin: string) => Promise<ReAuthResult>;
  setPIN: (pin: string) => Promise<{ success: boolean; error?: string }>;
  checkReAuthStatus: () => Promise<boolean>;
  isReAuthValid: () => Promise<boolean>;
  clearReAuthSession: () => Promise<void>;
  initializeBiometrics: () => Promise<{ success: boolean; error?: string }>;
}

export const useReAuth = (): UseReAuthReturn => {
  const dispatch = useDispatch<AppDispatch>();
  const { isReAuthenticated, reAuthLoading, reAuthError } = useSelector(
    (state: RootState) => state.auth
  );

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  /**
   * Initialize biometric capabilities on mount
   */
  const initializeBiometrics = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await reAuthService.isBiometricAvailable();
      setBiometricAvailable(result.available || false);
      setBiometryType(result.biometryType || null);
      return { success: result.available || false, error: result.error };
    } catch (error: any) {
      setBiometricAvailable(false);
      setBiometryType(null);
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Check current re-authentication status
   */
  const checkReAuthStatus = useCallback(async (): Promise<boolean> => {
    try {
      const isValid = await reAuthService.isReAuthValid();
      const remaining = await reAuthService.getReAuthTimeRemaining();

      setTimeRemaining(remaining);
      dispatch(setReAuthState(isValid));

      return isValid;
    } catch (error: any) {
      dispatch(setReAuthError(error.message));
      return false;
    }
  }, [dispatch]);

  /**
   * Alias for checkReAuthStatus for backward compatibility
   */
  const isReAuthValid = useCallback(async (): Promise<boolean> => {
    return await checkReAuthStatus();
  }, [checkReAuthStatus]);

  /**
     * Perform biometric authentication with device PIN fallback
     */
    const authenticateWithBiometrics = useCallback(async (): Promise<ReAuthResult> => {
      dispatch(setReAuthLoading(true));
      dispatch(setReAuthError(null));

      try {
        const result = await reAuthService.authenticateWithBiometrics({
          promptMessage: 'Confirm your identity to access sensitive information',
          cancelButtonText: 'Cancel',
        });

       if (result.success) {
         dispatch(setReAuthState(true));
         const remaining = await reAuthService.getReAuthTimeRemaining();
         setTimeRemaining(remaining);
       } else {
         dispatch(setReAuthError(result.error || 'Biometric authentication failed'));
       }

       return result;
     } catch (error: any) {
       const errorMessage = error.message || 'Biometric authentication error';
       dispatch(setReAuthError(errorMessage));
       return { success: false, method: 'biometric', error: errorMessage };
     } finally {
       dispatch(setReAuthLoading(false));
     }
   }, [dispatch]);

  /**
   * Authenticate with PIN
   */
  const authenticateWithPIN = useCallback(async (pin: string): Promise<ReAuthResult> => {
    dispatch(setReAuthLoading(true));
    dispatch(setReAuthError(null));

    try {
      const result = await reAuthService.authenticateWithPIN(pin);

      if (result.success) {
        dispatch(setReAuthState(true));
        const remaining = await reAuthService.getReAuthTimeRemaining();
        setTimeRemaining(remaining);
      } else {
        dispatch(setReAuthError(result.error || 'PIN authentication failed'));
      }

      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'PIN authentication error';
      dispatch(setReAuthError(errorMessage));
      return { success: false, method: 'pin', error: errorMessage };
    } finally {
      dispatch(setReAuthLoading(false));
    }
  }, [dispatch]);

  /**
   * Set PIN
   */
  const setPIN = useCallback(async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      return await reAuthService.setPIN(pin);
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to set PIN' };
    }
  }, []);


  /**
    * Perform re-authentication using biometric verification with device PIN fallback
    */
   const performReAuthentication = useCallback(async (): Promise<ReAuthResult> => {
     dispatch(setReAuthLoading(true));
     dispatch(setReAuthError(null));

     try {
       // First check if re-auth is still valid
       const isValid = await checkReAuthStatus();
       if (isValid) {
         dispatch(setReAuthLoading(false));
         return { success: true, method: 'none' };
       }

       // Perform re-authentication
       const result = await reAuthService.performReAuthentication();

       if (result.success) {
         dispatch(setReAuthState(true));
         const remaining = await reAuthService.getReAuthTimeRemaining();
         setTimeRemaining(remaining);
       } else {
         dispatch(setReAuthError(result.error || 'Re-authentication failed'));
       }

       return result;
     } catch (error: any) {
       const errorMessage = error.message || 'Re-authentication error';
       dispatch(setReAuthError(errorMessage));
       return { success: false, method: 'none', error: errorMessage };
     } finally {
       dispatch(setReAuthLoading(false));
     }
   }, [dispatch, checkReAuthStatus]);

  /**
   * Clear re-authentication session
   */
  const clearReAuthSession = useCallback(async (): Promise<void> => {
    try {
      await reAuthService.clearReAuthState();
      dispatch(clearReAuthState());
      setTimeRemaining(0);
    } catch (error: any) {
      console.error('Failed to clear re-auth session:', error);
      dispatch(setReAuthError(error.message));
    }
  }, [dispatch]);

  /**
   * Initialize biometric capabilities on mount
   */
  useEffect(() => {
    initializeBiometrics();
  }, [initializeBiometrics]);

  /**
   * Periodic check for re-auth expiration
   */
  useEffect(() => {
    if (!isReAuthenticated) return;

    const interval = setInterval(async () => {
      const isValid = await checkReAuthStatus();
      if (!isValid) {
        dispatch(clearReAuthState());
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isReAuthenticated, checkReAuthStatus, dispatch]);

  return {
    // State
    isReAuthenticated,
    isLoading: reAuthLoading,
    error: reAuthError,
    timeRemaining,
    biometricAvailable,
    biometryType,

    // Methods
    performReAuthentication,
    authenticateWithBiometrics,
    authenticateWithPIN,
    setPIN,
    checkReAuthStatus,
    isReAuthValid,
    clearReAuthSession,
    initializeBiometrics,
  };
};