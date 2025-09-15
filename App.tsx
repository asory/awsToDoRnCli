import './src/polyfills';

import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/application/store';
import { AppNavigator } from './src/presentation/navigation/AppNavigator';
import { configureAmplify } from './src/shared/config/aws-config';
import { useAuth } from './src/presentation/hooks/useAuth';

function App() {
  useEffect(() => {
    configureAmplify();
  }, []);

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

  useEffect(() => {
    const initializeAuth = async () => {
      await checkAuthStatus();
    };
    initializeAuth();
  }, [checkAuthStatus]); // Now safe to include since checkAuthStatus is memoized

  return <AppNavigator />;
}

export default App;
