import { useEffect, useState } from 'react';
import { LogBox, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import BrandSplash from '@/screens/splash/SplashScreen';
import '../global.css';

const SPLASH_MIN_MS = 1800;

// Dev-only warning from expo-router's NavigationContainer: the async initial-URL lookup of a discarded
// first render resolves after the committed render has mounted. The committed render handles the link.
LogBox.ignoreLogs(["Can't perform a React state update on a component that hasn't mounted yet"]);

// Keep the splash screen visible while we fetch fonts and restore the session
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular: require('@/assets/fonts/Inter_400Regular.ttf'),
    Inter_500Medium: require('@/assets/fonts/Inter_500Medium.ttf'),
    Inter_600SemiBold: require('@/assets/fonts/Inter_600SemiBold.ttf'),
    Inter_700Bold: require('@/assets/fonts/Inter_700Bold.ttf'),
  });

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

  // The navigator has to be in the first render so a cold URL is not replaced with `/`.
  // While the session is still loading, isAuthenticated is false; applying that guard now
  // would drop the protected route to the anchor before we know a redirect is required.
  const sessionReady = !isLoading;

  // Flipping a guard drops that group's history, so Back can never cross the auth boundary.
  return (
    <SafeAreaProvider style={styles.root}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!sessionReady || isAuthenticated}>
          <Stack.Screen name="(app)" />
          <Stack.Screen name="profile" />
        </Stack.Protected>
        <Stack.Protected guard={!sessionReady || !isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
      {!ready && (
        <View style={styles.splash}>
          <BrandSplash fontsReady={fontsReady} onReady={() => SplashScreen.hide()} />
        </View>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splash: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
});
