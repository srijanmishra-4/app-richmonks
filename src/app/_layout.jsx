import { useEffect, useState } from 'react';
import { LogBox } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import BrandSplash from '@/components/splash/SplashScreen';
import '../global.css';

const SPLASH_MIN_MS = 1800;

// Dev-only warning from expo-router's NavigationContainer: the async initial-URL lookup of a discarded
// first render resolves after the committed render has mounted. The committed render handles the link.
LogBox.ignoreLogs(["Can't perform a React state update on a component that hasn't mounted yet"]);

// Keep the splash screen visible while we fetch fonts and restore the session
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });

  return (
    <AuthProvider>
      <RootNavigator fontsReady={fontsLoaded || !!fontError} />
    </AuthProvider>
  );
}

function RootNavigator({ fontsReady }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [minShown, setMinShown] = useState(false);
  const ready = fontsReady && !isLoading && minShown;

  useEffect(() => {
    const t = setTimeout(() => setMinShown(true), SPLASH_MIN_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready) {
      SplashScreen.hide();
    }
  }, [ready]);

  if (!ready) {
    return <BrandSplash fontsReady={fontsReady} onReady={() => SplashScreen.hide()} />;
  }

  // Flipping a guard drops that group's history, so Back can never cross the auth boundary.
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(app)" />
          <Stack.Screen name="trending-stocks" />
          <Stack.Screen name="trending-options" />
        </Stack.Protected>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </SafeAreaProvider>
  );
}
