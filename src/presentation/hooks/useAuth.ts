import { useSelector, useDispatch } from 'react-redux';
import { useRef, useEffect, useCallback } from 'react';
import { RootState, AppDispatch } from '../../application/store';
import { loginStart, loginSuccess, loginFailure, logout, refreshTokenSuccess, proactiveRefreshSuccess, setLoading } from '../../application/slices/authSlice';
import { CognitoService } from '../../infrastructure/services/CognitoService';
import { SecureStorage } from '../../infrastructure/storage/SecureStorage';
import { ApiClient } from '../../infrastructure/api/ApiClient';
import { tasksApi } from '../../application/slices/tasksApi';
import { reAuthService } from '../../infrastructure/services/BiometricService';
import { LoginCredentials, RegisterData } from '../../core/entities/User';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, tokens, isAuthenticated, isLoading, error } = useSelector(
    (state: RootState) => state.auth
  );

  // Refs for managing background token refresh
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshInProgressRef = useRef(false);

  const login = async (credentials: LoginCredentials) => {
    dispatch(loginStart());

    try {
      const cognitoService = new CognitoService();
      const result = await cognitoService.login(credentials);

      // Store tokens securely with expiration
      await SecureStorage.storeToken('access', result.tokens.accessToken, result.tokens.expiresIn ? (result.tokens.expiresIn - Date.now()) / 1000 : undefined);
      if (result.tokens.refreshToken) {
        await SecureStorage.storeToken('refresh', result.tokens.refreshToken);
      }

      dispatch(loginSuccess(result));
      return { success: true };
    } catch (error: any) {
      console.log('Auth hook error details:', error);

      // Handle case where user is already signed in
      if (error.message?.includes('There is already a signed in user') ||
          error.message?.includes('already a signed in user')) {
        try {
          console.log('User already signed in, checking current authentication status');

          const cognitoService = new CognitoService();
          // Check if user is already authenticated
          const currentUser = await cognitoService.getCurrentUser();
          if (currentUser) {
            // Get current tokens
            const tokens = await cognitoService.refreshToken('');

            // Store tokens securely with expiration
            await SecureStorage.storeToken('access', tokens.accessToken, tokens.expiresIn ? (tokens.expiresIn - Date.now()) / 1000 : undefined);
            if (tokens.refreshToken) {
              await SecureStorage.storeToken('refresh', tokens.refreshToken);
            }

            dispatch(loginSuccess({ user: currentUser, tokens }));
            console.log('Successfully restored existing session');
            return { success: true, alreadyAuthenticated: true };
          }
        } catch (restoreError: any) {
          console.error('Failed to restore existing session:', restoreError);
          // Fall through to error handling
        }
      }

      dispatch(loginFailure(error.message));
      return { success: false, error: error.message };
    }
  };

  // Function to stop background token refresh
  const stopTokenRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
      refreshInProgressRef.current = false;
      console.log('Background token refresh stopped');
    }
  }, []);



  const logoutUser = async () => {
    try {
      // Stop background refresh immediately
      stopTokenRefresh();

      const cognitoService = new CognitoService();
      await cognitoService.logout();

      // Clear tokens from API client memory
      const apiClient = ApiClient.getInstance();
      apiClient.clearAuthTokens();

      // Clear all secure storage (this is redundant with CognitoService.logout but ensures completeness)
      await SecureStorage.clearAll();

      // Clear RTK Query cache for user-specific data
      dispatch(tasksApi.util.resetApiState());

      // Clear re-authentication state
      await reAuthService.clearReAuthState();

      // Reset Redux state
      dispatch(logout());

      console.log('Logout completed successfully');
    } catch (error: any) {
      console.error('Logout error:', error);
      // Even if logout fails, stop refresh and clear local state
      stopTokenRefresh();
      const apiClient = ApiClient.getInstance();
      apiClient.clearAuthTokens();
      await SecureStorage.clearAll();

      // Clear RTK Query cache for user-specific data
      dispatch(tasksApi.util.resetApiState());

      // Clear re-authentication state
      await reAuthService.clearReAuthState();

      dispatch(logout());
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const cognitoService = new CognitoService();
      const user = await cognitoService.register(data);
      return { success: true, user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const confirmEmail = async (email: string, code: string) => {
    try {
      const cognitoService = new CognitoService();
      await cognitoService.confirmEmail(email, code);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const cognitoService = new CognitoService();
      await cognitoService.forgotPassword(email);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const confirmForgotPassword = async (email: string, code: string, newPassword: string) => {
    try {
      const cognitoService = new CognitoService();
      await cognitoService.confirmForgotPassword(email, code, newPassword);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const resendSignUpCode = async (email: string) => {
    try {
      const cognitoService = new CognitoService();
      await cognitoService.resendSignUpCode(email);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const cognitoService = new CognitoService();
      await cognitoService.resetPassword(email);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const confirmResetPassword = async (email: string, code: string, newPassword: string) => {
    try {
      const cognitoService = new CognitoService();
      await cognitoService.confirmResetPassword(email, code, newPassword);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const updateUserPassword = async (oldPassword: string, newPassword: string) => {
    try {
      const cognitoService = new CognitoService();
      await cognitoService.updatePassword(oldPassword, newPassword);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const refreshToken = async () => {
    try {
      const refreshTokenValue = await SecureStorage.getToken('refresh');
      if (refreshTokenValue) {
        const cognitoService = new CognitoService();
        const newTokens = await cognitoService.refreshToken(refreshTokenValue);

        // Store new tokens securely with expiration
        await SecureStorage.storeToken('access', newTokens.accessToken, newTokens.expiresIn ? (newTokens.expiresIn - Date.now()) / 1000 : undefined);
        if (newTokens.refreshToken) {
          await SecureStorage.storeToken('refresh', newTokens.refreshToken);
        }

        // Update Redux state
        dispatch(refreshTokenSuccess(newTokens));
        return { success: true, tokens: newTokens };
      }
      return { success: false, error: 'No refresh token available' };
    } catch (error: any) {
      console.error('Token refresh error:', error);
      return { success: false, error: error.message };
    }
  };

  const refreshTokenProactively = useCallback(async () => {
    try {
      const cognitoService = new CognitoService();
      const newTokens = await cognitoService.refreshTokenIfNeeded();

      if (newTokens) {
        // Update Redux state with new tokens
        dispatch(proactiveRefreshSuccess(newTokens));
        return { success: true, tokens: newTokens };
      }

      return { success: false, error: 'Token refresh not needed or failed' };
    } catch (error: any) {
      console.error('Proactive token refresh error:', error);
      return { success: false, error: error.message };
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Function to start background token refresh
  const startTokenRefresh = useCallback(() => {
    if (!isAuthenticated || refreshIntervalRef.current) return;

    refreshIntervalRef.current = setInterval(async () => {
      if (refreshInProgressRef.current) return;

      try {
        refreshInProgressRef.current = true;
        await refreshTokenProactively();
      } catch (error) {
        console.error('Automatic token refresh failed:', error);
      } finally {
        refreshInProgressRef.current = false;
      }
    }, 2 * 60 * 1000); // 2 minutes

    console.log('Background token refresh started');
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Manage token refresh interval based on authentication state
  useEffect(() => {
    if (isAuthenticated) {
      startTokenRefresh();
    } else {
      stopTokenRefresh();
    }

    return () => {
      stopTokenRefresh();
    };
  }, [isAuthenticated, startTokenRefresh, stopTokenRefresh]);

  const checkAuthStatus = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const token = await SecureStorage.getToken('access');
      if (token) {
        const cognitoService = new CognitoService();
        const user = await cognitoService.getCurrentUser();
        if (user) {
          // Fetch current tokens
          const tokens = await cognitoService.refreshToken('');
          dispatch(loginSuccess({ user, tokens }));
          dispatch(setLoading(false));
          return true;
        }
      }
      dispatch(setLoading(false));
      return false;
    } catch (error) {
      console.error('Auth check error:', error);
      dispatch(setLoading(false));
      return false;
    }
  }, [dispatch]);


  return {
    user,
    tokens,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    confirmEmail,
    forgotPassword,
    confirmForgotPassword,
    resendSignUpCode,
    resetPassword,
    confirmResetPassword,
    updatePassword: updateUserPassword,
    logout: logoutUser,
    refreshToken,
    refreshTokenProactively,
    checkAuthStatus,
  };
};