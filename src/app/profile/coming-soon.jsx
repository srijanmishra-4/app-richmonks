import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import ProfileHeader from '@/components/profile/ProfileHeader';
import ComingSoon from '@/components/reports/ComingSoon';

export default function ProfileComingSoonRoute() {
  const onBack = () => { if (router.canGoBack()) router.back(); else router.replace('/home'); };
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ProfileHeader title="Coming Soon" onBack={onBack} id="coming-soon-back" />
      <ComingSoon />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
});
