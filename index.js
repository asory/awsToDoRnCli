/**
 * @format
 */

import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

import { configureAmplify } from './src/shared/config/aws-config';
configureAmplify();

AppRegistry.registerComponent(appName, () => App);
