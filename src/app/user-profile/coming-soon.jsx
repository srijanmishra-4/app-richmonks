import { StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import ProfileHeader from '@/components/user-profile/ProfileHeader';
import ComingSoon from '@/components/reports/ComingSoon';
import { paramString } from '@/utils/reportParams';

export default function ProfileComingSoonRoute() {
  const params = useLocalSearchParams();
  const title = paramString(params.title).trim() || 'Coming Soon';
  const onBack = () => { if (router.canGoBack()) router.back(); else router.replace('/user-profile'); };
  const message = title === 'Coming Soon'
    ? undefined
    : `${title} will open here as soon as it is ready.`;
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ProfileHeader title={title} onBack={onBack} id="coming-soon-back" />
      <ComingSoon message={message} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
});
