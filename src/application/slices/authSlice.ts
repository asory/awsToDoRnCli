import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, AuthTokens } from '../../core/entities/User';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  // Re-authentication state
  isReAuthenticated: boolean;
  reAuthLoading: boolean;
  reAuthError: string | null;
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  // Re-authentication state
  isReAuthenticated: false,
  reAuthLoading: false,
  reAuthError: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ user: User; tokens: AuthTokens }>) => {
      state.user = action.payload.user;
      state.tokens = action.payload.tokens;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      // Clear re-authentication state on logout
      state.isReAuthenticated = false;
      state.reAuthLoading = false;
      state.reAuthError = null;
    },
    refreshTokenSuccess: (state, action: PayloadAction<AuthTokens>) => {
      state.tokens = action.payload;
    },
    proactiveRefreshSuccess: (state, action: PayloadAction<AuthTokens>) => {
      state.tokens = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    // Re-authentication actions
    setReAuthState: (state, action: PayloadAction<boolean>) => {
      state.isReAuthenticated = action.payload;
      if (!action.payload) {
        state.reAuthLoading = false;
        state.reAuthError = null;
      }
    },
    clearReAuthState: (state) => {
      state.isReAuthenticated = false;
      state.reAuthLoading = false;
      state.reAuthError = null;
    },
    setReAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.reAuthLoading = action.payload;
    },
    setReAuthError: (state, action: PayloadAction<string | null>) => {
      state.reAuthError = action.payload;
      state.reAuthLoading = false;
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  refreshTokenSuccess,
  proactiveRefreshSuccess,
  setLoading,
  setError,
  // Re-authentication actions
  setReAuthState,
  clearReAuthState,
  setReAuthLoading,
  setReAuthError,
} = authSlice.actions;

export default authSlice.reducer;