import { Stack } from 'expo-router';

export const unstable_settings = {
  anchor: 'index',
};

export default function ProfileLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }} />;
}
