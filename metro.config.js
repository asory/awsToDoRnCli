const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const { withSentryConfig } = require('@sentry/react-native/metro');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // AWS SDK v3 compatibility - exclude problematic modules
    blockList: [
      /\/node_modules\/@aws-sdk\/.*\/dist-cjs\/.*\.js$/,
      /\/node_modules\/@aws-sdk\/.*\/dist-es\/.*\.js$/,
    ],
    // Add extra node modules for AWS SDK
    extraNodeModules: {
      crypto: require.resolve('react-native-get-random-values'),
      stream: require.resolve('stream-browserify'),
    },
  },
  transformer: {
    // Enable experimental import support for AWS SDK
    allowOptionalDependencies: true,
  },
};

module.exports = withSentryConfig(
  mergeConfig(getDefaultConfig(__dirname), config),
);
