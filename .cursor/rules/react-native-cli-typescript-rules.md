# React Native CLI TypeScript Development Rules

You are an expert in TypeScript, React Native CLI, and Mobile UI development.

## Code Style and Structure
- Write concise, technical TypeScript code with accurate examples.
- Use functional and declarative programming patterns; avoid classes.
- Prefer iteration and modularization over code duplication.
- Use descriptive variable names with auxiliary verbs (e.g., isLoading, hasError).
- Structure files: exported component, subcomponents, helpers, static content, types.
- Follow React Native CLI official documentation for setting up and configuring your projects: https://reactnative.dev/docs/getting-started

## Naming Conventions
- Use lowercase with dashes for directories (e.g., components/auth-wizard).
- Favor named exports for components.

## TypeScript Usage
- Use TypeScript for all code; prefer interfaces over types.
- Avoid enums; use maps instead.
- Use functional components with TypeScript interfaces.
- Use strict mode in TypeScript for better type safety.

## Syntax and Formatting
- Use the "function" keyword for pure functions.
- Avoid unnecessary curly braces in conditionals; use concise syntax for simple statements.
- Use declarative JSX.
- Use Prettier for consistent code formatting.

## UI and Styling
- Use React Native's built-in components for common UI patterns and layouts.
- Implement responsive design with Flexbox and Dimensions API for screen size adjustments.
- Use styled-components or Tailwind CSS for component styling.
- Implement dark mode support using Appearance API.
- Ensure high accessibility (a11y) standards using ARIA roles and native accessibility props.
- Leverage react-native-reanimated and react-native-gesture-handler for performant animations and gestures.

## Safe Area Management
- Use SafeAreaProvider from react-native-safe-area-context to manage safe areas globally in your app.
- Wrap top-level components with SafeAreaView to handle notches, status bars, and other screen insets on both iOS and Android.
- Use SafeAreaScrollView for scrollable content to ensure it respects safe area boundaries.
- Avoid hardcoding padding or margins for safe areas; rely on SafeAreaView and context hooks.

## Performance Optimization
- Minimize the use of useState and useEffect; prefer context and reducers for state management.
- Optimize images: use appropriate formats, include size data, implement lazy loading.
- Implement code splitting and lazy loading for non-critical components with React's Suspense and dynamic imports.
- Profile and monitor performance using React Native's built-in tools and Flipper.
- Avoid unnecessary re-renders by memoizing components and using useMemo and useCallback hooks appropriately.

## Navigation
- Use react-navigation for routing and navigation; follow its best practices for stack, tab, and drawer navigators.
- Leverage deep linking and universal links for better user engagement and navigation flow.

## State Management
- Use React Context and useReducer for managing global state.
- Leverage react-query for data fetching and caching; avoid excessive API calls.
- For complex state management, consider using Zustand or Redux Toolkit.

## Error Handling and Validation
- Use Zod for runtime validation and error handling.
- Implement proper error logging using Sentry or a similar service.
- Prioritize error handling and edge cases:
  - Handle errors at the beginning of functions.
  - Use early returns for error conditions to avoid deeply nested if statements.
  - Avoid unnecessary else statements; use if-return pattern instead.
  - Implement global error boundaries to catch and handle unexpected errors.

## Testing
- Write unit tests using Jest and React Native Testing Library.
- Implement integration tests for critical user flows using Detox.
- Consider snapshot testing for components to ensure UI consistency.

## Security
- Sanitize user inputs to prevent XSS attacks.
- Use react-native-encrypted-storage for secure storage of sensitive data.
- Ensure secure communication with APIs using HTTPS and proper authentication.

## Internationalization (i18n)
- Use react-native-i18n or react-native-localize for internationalization and localization.
- Support multiple languages and RTL layouts.
- Ensure text scaling and font adjustments for accessibility.

## Project Initialization
### Setting up a New React Native CLI Project

1. **Prerequisites Installation:**
   ```bash
   # Install Node.js (LTS version recommended)
   # Install Watchman (macOS)
   brew install watchman
   # Install Xcode (macOS for iOS development)
   # Install Android Studio (for Android development)
   ```

2. **Project Creation:**
   ```bash
   npx react-native@latest init YourProjectName --template react-native-template-typescript
   cd YourProjectName
   ```

3. **TypeScript Configuration:**
   - The template includes basic TypeScript setup
   - Configure `tsconfig.json` for strict type checking:
   ```json
   {
     "compilerOptions": {
       "target": "esnext",
       "module": "commonjs",
       "lib": ["es2017"],
       "allowJs": true,
       "jsx": "react-native",
       "noEmit": true,
       "isolatedModules": true,
       "strict": true,
       "moduleResolution": "node",
       "allowSyntheticDefaultImports": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "resolveJsonModule": true,
       "baseUrl": ".",
       "paths": {
         "@/*": ["src/*"]
       }
     },
     "exclude": [
       "node_modules",
       "android",
       "ios"
     ]
   }
   ```

## Dependency Management
### Package Management Best Practices

1. **Use Yarn or npm for dependency management:**
   ```bash
   # Initialize with Yarn
   yarn install
   ```

2. **Essential Dependencies for RN CLI:**
   ```bash
   yarn add react-native-reanimated react-native-gesture-handler
   yarn add -D @types/react @types/react-native typescript
   ```

3. **Native Dependencies:**
   - For iOS: `cd ios && pod install`
   - For Android: Ensure Android SDK is properly configured

4. **Version Management:**
   - Pin exact versions in package.json for production stability
   - Use `yarn.lock` or `package-lock.json` for reproducible builds

## Build Configurations
### iOS Build Setup

1. **Xcode Configuration:**
   - Open `ios/YourProject.xcworkspace`
   - Configure signing certificates
   - Set up build schemes for Debug/Release

2. **Build Script:**
   ```bash
   # Clean build
   cd ios && rm -rf build && cd ..
   # Build for iOS
   npx react-native run-ios --configuration Release
   ```

### Android Build Setup

1. **Gradle Configuration:**
   - Configure `android/app/build.gradle`
   - Set up signing configs for release builds
   - Configure ProGuard for code obfuscation

2. **Build Script:**
   ```bash
   # Clean build
   cd android && ./gradlew clean && cd ..
   # Build for Android
   npx react-native run-android --variant release
   ```

## Debugging Strategies
### Development Tools

1. **React Native Debugger:**
   ```bash
   # Install globally
   npm install -g react-native-debugger
   # Launch debugger
   react-native-debugger
   ```

2. **Flipper Integration:**
   ```bash
   yarn add react-native-flipper
   # Configure in App.tsx
   if (__DEV__) {
     require('react-native-flipper');
   }
   ```

3. **Chrome DevTools:**
   - Enable remote debugging in React Native menu
   - Use console.log with structured data

4. **Native Debugging:**
   - iOS: Use Xcode debugger
   - Android: Use Android Studio debugger

## Testing Frameworks
### Unit and Integration Testing

1. **Jest Configuration:**
   ```javascript
   // jest.config.js
   module.exports = {
     preset: 'react-native',
     setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
     transformIgnorePatterns: [
       'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))'
     ],
     collectCoverageFrom: [
       'src/**/*.{ts,tsx}',
       '!src/**/*.d.ts',
     ],
   };
   ```

2. **Testing Library Setup:**
   ```bash
   yarn add -D @testing-library/react-native @testing-library/jest-native
   ```

3. **Detox for E2E Testing:**
   ```bash
   yarn add -D detox
   # Initialize Detox
   npx detox init -r jest
   ```

## Deployment Processes
### App Store Deployment

1. **iOS App Store:**
   ```bash
   # Build release version
   npx react-native run-ios --configuration Release
   # Archive in Xcode
   # Upload to App Store Connect
   ```

2. **Google Play Store:**
   ```bash
   # Generate signed APK/AAB
   cd android && ./gradlew bundleRelease
   # Upload to Google Play Console
   ```

3. **Code Signing:**
   - iOS: Configure provisioning profiles
   - Android: Set up keystore and signing config

## Common Pitfalls to Avoid
### Development Mistakes

1. **Metro Bundler Issues:**
   - Clear cache: `npx react-native start --reset-cache`
   - Delete node_modules and reinstall if needed

2. **Native Module Conflicts:**
   - Always check compatibility between React Native version and native modules
   - Use `react-native doctor` to diagnose issues

3. **Performance Issues:**
   - Avoid large bundle sizes by code splitting
   - Optimize images and assets
   - Use FlatList with proper keyExtractor

4. **State Management:**
   - Don't overuse Context for complex state
   - Prefer specialized libraries for complex scenarios

5. **TypeScript Issues:**
   - Always define proper types for props and state
   - Use strict mode to catch type errors early

## Key Conventions
1. Use React Native CLI for maximum customization and native module access.
2. Prioritize Mobile Web Vitals (Load Time, Jank, and Responsiveness).
3. Use react-native-config for managing environment variables and configuration.
4. Use react-native-permissions to handle device permissions gracefully.
5. Implement code-push or similar for over-the-air updates.
6. Follow React Native's best practices for app deployment and publishing.
7. Ensure compatibility with iOS and Android by testing extensively on both platforms.

## API Documentation
- Use React Native's official documentation: https://reactnative.dev/docs/getting-started
- Refer to React Native documentation for detailed information on components and APIs.