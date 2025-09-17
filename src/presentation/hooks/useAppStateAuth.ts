import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../application/store';
import { useAuth } from './useAuth';

export const useAppStateAuth = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { checkAuthStatus } = useAuth();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      
      // If app becomes active and user was authenticated, verify session
      if (
        appState.current.match(/inactive|background/) && 
        nextAppState === 'active' && 
        isAuthenticated
      ) {
        try {
          await checkAuthStatus();
        } catch (error) {
        }
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [isAuthenticated, checkAuthStatus]);

  return {
    currentAppState: appState.current,
  };
};
