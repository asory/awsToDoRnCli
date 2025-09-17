import { useRef, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../application/store';
import { proactiveRefreshSuccess } from '../../application/slices/authSlice';
import { CognitoService } from '../../infrastructure/services/CognitoService';

export const useTokenRefresh = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, tokens } = useSelector((state: RootState) => state.auth);
  
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshInProgressRef = useRef(false);
  const cognitoServiceRef = useRef(new CognitoService());

  const calculateRefreshInterval = useCallback((expiresIn: number) => {
    const refreshTime = Math.max((expiresIn * 1000 * 0.66), 5 * 60 * 1000);
    return Math.min(refreshTime, 15 * 60 * 1000);
  }, []);

  const refreshTokenProactively = useCallback(async () => {
    if (refreshInProgressRef.current) return { success: false, error: 'Refresh in progress' };
    
    try {
      refreshInProgressRef.current = true;
      const newTokens = await cognitoServiceRef.current.refreshTokenIfNeeded();

      if (newTokens) {
        dispatch(proactiveRefreshSuccess(newTokens));
        return { success: true, tokens: newTokens };
      }

      return { success: false, error: 'Token refresh not needed or failed' };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      refreshInProgressRef.current = false;
    }
  }, [dispatch]);

  const stopTokenRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
      refreshInProgressRef.current = false;
    }
  }, []);

  const startTokenRefresh = useCallback(() => {
    if (!isAuthenticated || refreshIntervalRef.current || !tokens?.expiresIn) return;

    const interval = calculateRefreshInterval(tokens.expiresIn - Date.now());
    
    refreshIntervalRef.current = setInterval(async () => {
      if (refreshInProgressRef.current) return;

      try {
        await refreshTokenProactively();
      } catch (error) {
      }
    }, interval);

  }, [isAuthenticated, tokens?.expiresIn, calculateRefreshInterval, refreshTokenProactively]);

  useEffect(() => {
    let mounted = true;
    
    if (isAuthenticated && mounted) {
      startTokenRefresh();
    } else {
      stopTokenRefresh();
    }

    return () => {
      mounted = false;
      stopTokenRefresh();
    };
  }, [isAuthenticated, startTokenRefresh, stopTokenRefresh]);

  return {
    refreshTokenProactively,
    startTokenRefresh,
    stopTokenRefresh,
    isRefreshing: refreshInProgressRef.current,
  };
};
