import { Stack } from 'expo-router';

// Deep links to a report still land with Home underneath, so Back returns to /home.
export const unstable_settings = {
  anchor: 'index',
};

export default function HomeStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
