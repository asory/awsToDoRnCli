// Import polyfills first to fix AWS SDK compatibility issues
import './src/polyfills';

import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/application/store';
import { AppNavigator } from './src/presentation/navigation/AppNavigator';
import { configureAmplify } from './src/shared/config/aws-config';

function App() {
  useEffect(() => {
    configureAmplify();
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <AppNavigator />
      </SafeAreaProvider>
    </Provider>
  );
}

export default App;
