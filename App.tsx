import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/application/store';
import AppNavigator from './src/presentation/navigation/AppNavigator';
import LoadingScreen from './src/presentation/screens/LoadingScreen';
import { useAuth } from './src/presentation/hooks/useAuth';
import { useAppStateAuth } from './src/presentation/hooks/useAppStateAuth';
import * as Sentry from '@sentry/react-native';
import { SENTRY_DSN } from '@env';

export const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

Sentry.init({
  dsn: SENTRY_DSN,
  sendDefaultPii: true,
  integrations: [Sentry.feedbackIntegration(), navigationIntegration],
});

function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <AppContent />
      </SafeAreaProvider>
    </Provider>
  );
}

function AppContent() {
  const { checkAuthStatus } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  useAppStateAuth();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await checkAuthStatus();
      } catch (error) {
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [checkAuthStatus]);

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return <AppNavigator />;
}

export default Sentry.wrap(App);
