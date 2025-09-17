import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/application/store';
import AppNavigator from './src/presentation/navigation/AppNavigator';
import LoadingScreen from './src/presentation/screens/LoadingScreen';
import { useAuth } from './src/presentation/hooks/useAuth';
import { useAppStateAuth } from './src/presentation/hooks/useAppStateAuth';

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

  // Monitor app state changes for session validation
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

  // Show loading screen until auth check is complete
  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return <AppNavigator />;
}

export default App;
