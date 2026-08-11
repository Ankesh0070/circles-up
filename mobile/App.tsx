import './src/styles/global.css';
import { useEffect } from 'react';
import * as Sentry from '@sentry/react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';
import { setupCriticalAlertChannel } from './src/shared/api/criticalAlerts';

Sentry.init({
  // TODO: set EXPO_PUBLIC_SENTRY_DSN once a Sentry project exists (Phase 1
  // vendor step — see README.md "Accounts you need to create").
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 1.0,
});

function App() {
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    // Phase 48 — Android SOS notification channel setup. Safe to run
    // unconditionally on every launch (idempotent, no permission prompt).
    setupCriticalAlertChannel();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <RootNavigator navigationRef={navigationRef} />
        </NavigationContainer>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(App);
