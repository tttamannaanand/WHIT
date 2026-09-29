import React from 'react';
import { LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/lib/auth-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { configurePurchases } from './src/lib/purchases';

// Configured at module load, not inside a useEffect: AuthProvider's own
// mount effect may call identify() (see lib/auth-context.tsx) to restore a
// saved session, and that has to find Purchases already configured. Child
// effects fire before a parent's own useEffect, so doing this in App's
// useEffect would race and sometimes lose.
configurePurchases();

// Keep the dev-only warning toast out of demo recordings.
LogBox.ignoreAllLogs();

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
