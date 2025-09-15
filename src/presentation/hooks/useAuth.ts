import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../application/store';
import { loginStart, loginSuccess, loginFailure, logout } from '../../application/slices/authSlice';
import { CognitoService } from '../../infrastructure/auth/CognitoService';
import { SecureStorage } from '../../infrastructure/storage/SecureStorage';
import { LoginCredentials, RegisterData } from '../../core/entities/User';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, tokens, isAuthenticated, isLoading, error } = useSelector(
    (state: RootState) => state.auth
  );

  const login = async (credentials: LoginCredentials) => {
    dispatch(loginStart());

    try {
      const cognitoService = new CognitoService();
      const result = await cognitoService.login(credentials);

      // Store tokens securely
      await SecureStorage.setSecureItem('accessToken', result.tokens.accessToken);
      await SecureStorage.setSecureItem('refreshToken', result.tokens.refreshToken || '');

      dispatch(loginSuccess(result));
      return { success: true };
    } catch (error: any) {
      console.log('Auth hook error details:', error);
      dispatch(loginFailure(error.message));
      return { success: false, error: error.message };
    }
  };

  const logoutUser = async () => {
    try {
      const cognitoService = new CognitoService();
      await cognitoService.logout();
      await SecureStorage.clearAll();
      dispatch(logout());
    } catch (error: any) {
      console.error('Logout error:', error);
      // Still clear local state even if API call fails
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

  const checkAuthStatus = async () => {
    try {
      const token = await SecureStorage.getSecureItem('accessToken');
      if (token) {
        const cognitoService = new CognitoService();
        const user = await cognitoService.getCurrentUser();
        if (user) {
          // User is still authenticated
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  };

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
    logout: logoutUser,
    checkAuthStatus,
  };
};