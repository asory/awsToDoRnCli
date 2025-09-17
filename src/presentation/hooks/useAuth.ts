import { useSelector, useDispatch } from 'react-redux';
import { useMemo, useCallback } from 'react';
import { RootState, AppDispatch } from '../../application/store';
import { loginStart, loginSuccess, loginFailure, logout, refreshTokenSuccess, setLoading } from '../../application/slices/authSlice';
import { CognitoService } from '../../infrastructure/services/CognitoService';
import { ApiClient } from '../../infrastructure/api/ApiClient';
import { reAuthService } from '../../infrastructure/services/BiometricService';
import { LoginCredentials, RegisterData } from '../../core/entities/User';
import { useTokenRefresh } from './useTokenRefresh';
import { useSecureTokenStorage } from './useSecureTokenStorage';
import { useAuthValidation } from './useAuthValidation';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, tokens, isAuthenticated, isLoading, error } = useSelector(
    (state: RootState) => state.auth
  );

  const { stopTokenRefresh } = useTokenRefresh();
  const { storeTokens, clearTokens, getStoredTokens, validateStoredTokens } = useSecureTokenStorage();
  const { handleAuthError } = useAuthValidation();
  
  const cognitoService = useMemo(() => new CognitoService(), []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    dispatch(loginStart());

    try {
      const result = await cognitoService.login(credentials);
      await storeTokens(result.tokens);
      dispatch(loginSuccess(result));
      return { success: true };
    } catch (loginError: any) {

      // Handle case where user is already signed in
      if (loginError.message?.includes('There is already a signed in user') ||
          loginError.message?.includes('already a signed in user')) {
        try {
          
          const currentUser = await cognitoService.getCurrentUser();
          if (currentUser) {
            const refreshedTokens = await cognitoService.refreshToken('');
            await storeTokens(refreshedTokens);
            dispatch(loginSuccess({ user: currentUser, tokens: refreshedTokens }));
            return { success: true, alreadyAuthenticated: true };
          }
        } catch (restoreError: any) {
        }
      }

      const authError = handleAuthError(loginError, 'login');
      dispatch(loginFailure(authError.message));
      return { success: false, error: authError.message };
    }
  }, [dispatch, cognitoService, storeTokens, handleAuthError]);




  const logoutUser = useCallback(async () => {
    const cleanupTasks = [
      () => stopTokenRefresh(),
      () => cognitoService.logout(),
      () => ApiClient.getInstance().clearAuthTokens(),
      () => clearTokens(),
      () => reAuthService.clearReAuthState(),
      () => dispatch(logout())
    ];
    
    for (const task of cleanupTasks) {
      try {
        await task();
      } catch (logoutError) {
      }
    }
  }, [stopTokenRefresh, cognitoService, clearTokens, dispatch]);

  const register = useCallback(async (data: RegisterData) => {
    try {
        const newUser = await cognitoService.register(data);
      return { success: true, user: newUser };
    } catch (registerError: any) {
      const authError = handleAuthError(registerError, 'register');
      return { success: false, error: authError.message };
    }
  }, [cognitoService, handleAuthError]);

  const confirmEmail = useCallback(async (email: string, code: string) => {
    try {
      await cognitoService.confirmEmail(email, code);
      return { success: true };
    } catch (confirmError: any) {
      const authError = handleAuthError(confirmError, 'confirmEmail');
      return { success: false, error: authError.message };
    }
  }, [cognitoService, handleAuthError]);

  const forgotPassword = useCallback(async (email: string) => {
    try {
      await cognitoService.forgotPassword(email);
      return { success: true };
    } catch (forgotError: any) {
      const authError = handleAuthError(forgotError, 'forgotPassword');
      return { success: false, error: authError.message };
    }
  }, [cognitoService, handleAuthError]);

  const confirmForgotPassword = useCallback(async (email: string, code: string, newPassword: string) => {
    try {
      await cognitoService.confirmForgotPassword(email, code, newPassword);
      return { success: true };
    } catch (confirmForgotError: any) {
      const authError = handleAuthError(confirmForgotError, 'confirmForgotPassword');
      return { success: false, error: authError.message };
    }
  }, [cognitoService, handleAuthError]);

  const resendSignUpCode = useCallback(async (email: string) => {
    try {
      await cognitoService.resendSignUpCode(email);
      return { success: true };
    } catch (resendError: any) {
      const authError = handleAuthError(resendError, 'resendSignUpCode');
      return { success: false, error: authError.message };
    }
  }, [cognitoService, handleAuthError]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await cognitoService.resetPassword(email);
      return { success: true };
    } catch (resetError: any) {
      const authError = handleAuthError(resetError, 'resetPassword');
      return { success: false, error: authError.message };
    }
  }, [cognitoService, handleAuthError]);

  const confirmResetPassword = useCallback(async (email: string, code: string, newPassword: string) => {
    try {
      await cognitoService.confirmResetPassword(email, code, newPassword);
      return { success: true };
    } catch (confirmResetError: any) {
      const authError = handleAuthError(confirmResetError, 'confirmResetPassword');
      return { success: false, error: authError.message };
    }
  }, [cognitoService, handleAuthError]);

  const updateUserPassword = useCallback(async (oldPassword: string, newPassword: string) => {
    try {
      await cognitoService.updatePassword(oldPassword, newPassword);
      return { success: true };
    } catch (updateError: any) {
      const authError = handleAuthError(updateError, 'updatePassword');
      return { success: false, error: authError.message };
    }
  }, [cognitoService, handleAuthError]);

  const refreshToken = useCallback(async () => {
    try {
      const { refresh: refreshTokenValue } = await getStoredTokens();
      if (refreshTokenValue) {
        const newTokens = await cognitoService.refreshToken(refreshTokenValue);
        await storeTokens(newTokens);
        dispatch(refreshTokenSuccess(newTokens));
        return { success: true, tokens: newTokens };
      }
      return { success: false, error: 'No refresh token available' };
    } catch (refreshError: any) {
      const authError = handleAuthError(refreshError, 'refreshToken');
      return { success: false, error: authError.message };
    }
  }, [cognitoService, storeTokens, getStoredTokens, dispatch, handleAuthError]);



  const checkAuthStatus = useCallback(async () => {
    dispatch(setLoading(true));
    
    try {
      // First check if we have stored tokens
      const { access: accessToken, refresh: refreshTokenValue } = await getStoredTokens();
      
      if (!accessToken) {
        await clearTokens();
        return false;
      }
      
      // Validate token and get current user
      const [isTokenValid, currentUser] = await Promise.all([
        validateStoredTokens(),
        cognitoService.getCurrentUser()
      ]);
      
      if (!isTokenValid || !currentUser) {
        // Try to refresh tokens if we have a refresh token
        if (refreshTokenValue) {
          try {
            const newTokens = await cognitoService.refreshToken(refreshTokenValue);
            await storeTokens(newTokens);
            
            // Try to get user again with new tokens
            const userAfterRefresh = await cognitoService.getCurrentUser();
            if (userAfterRefresh) {
              dispatch(loginSuccess({ user: userAfterRefresh, tokens: newTokens }));
              return true;
            }
          } catch (refreshError) {
          }
        }
        
        await clearTokens();
        return false;
      }
      
      // Check if token needs proactive refresh
      const refreshedTokens = await cognitoService.refreshTokenIfNeeded();
      const finalTokens = refreshedTokens || {
        accessToken: accessToken,
        refreshToken: refreshTokenValue || '',
        idToken: '', // Will be filled by getAuthTokens if needed
        expiresIn: 0,
        tokenType: 'Bearer',
        scopes: []
      };
      
      // If we don't have complete token info, try to get it
      if (!finalTokens.idToken) {
        try {
          const completeTokens = await cognitoService.getAuthTokens();
          if (completeTokens) {
            Object.assign(finalTokens, completeTokens);
          }
        } catch (getTokensError) {
        }
      }
      
      dispatch(loginSuccess({ user: currentUser, tokens: finalTokens }));
      return true;
      
    } catch (checkError) {
      await clearTokens();
      return false;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, getStoredTokens, validateStoredTokens, clearTokens, cognitoService, storeTokens]);


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
    checkAuthStatus,
  };
};