import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Image, ScrollView, Keyboard, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import SignupForm from '@/components/signup/SignupForm';
import Snackbar, { useSnackbar } from '@/components/Snackbar';
import { RMLoaderOverlay } from '@/components/RMLoader/RMLoader';

const bgMobile = require('@/assets/blank-bg-mobile.png');
const bgWeb = require('@/assets/login-bg-web-2.png');

const MOBILE_IMAGE_RATIO = 1672 / 941;
const ARTWORK_ANCHOR_RATIO = 940 / 1672;

function WideSignupCard({ onSnackbar, onLoadingChange }) {
  return (
    <View
      style={{
        width: 440,
        maxWidth: '90%',
        alignSelf: 'flex-end',
        marginRight: '12%',
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 36,
        ...(Platform.OS === 'web'
          ? { boxShadow: '0 12px 32px rgba(15, 23, 42, 0.1)' }
          : {
              shadowColor: '#0F172A',
              shadowOpacity: 0.1,
              shadowRadius: 32,
              shadowOffset: { width: 0, height: 12 },
              elevation: 8,
            }),
      }}
    >
      <SignupForm wide onSnackbar={onSnackbar} onLoadingChange={onLoadingChange} />
    </View>
  );
}

export default function SignupScreen() {
  const { width, isPhone } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const keyboardFrameRef = useRef(null);
  const layoutHeightRef = useRef(0);
  const closedLayoutRef = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [bottomLift, setBottomLift] = useState(0);
  const [heroHeight, setHeroHeight] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const snackbar = useSnackbar();

  const syncLift = useCallback((laidOut, kbHeight) => {
    if (kbHeight <= 0) {
      setBottomLift((current) => (current === 0 ? current : 0));
      return;
    }
    const base = closedLayoutRef.current || laidOut;
    const shrink = Math.max(0, base - laidOut);
    const next = Math.max(0, kbHeight - shrink + 16);
    setBottomLift((current) => (current === next ? current : next));
  }, []);

  const onRootLayout = useCallback((event) => {
    const next = Math.round(event.nativeEvent.layout.height);
    layoutHeightRef.current = next;
    if (keyboardFrameRef.current == null) closedLayoutRef.current = next;
    syncLift(next, keyboardFrameRef.current?.height ?? 0);
  }, [syncLift]);

  const onHeroLayout = useCallback((event) => {
    const next = Math.round(event.nativeEvent.layout.height);
    setHeroHeight((current) => (current === next ? current : next));
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;

    const showEvents = Platform.OS === 'ios' ? ['keyboardWillShow', 'keyboardDidShow'] : ['keyboardDidShow'];
    const hideEvents = Platform.OS === 'ios' ? ['keyboardWillHide', 'keyboardDidHide'] : ['keyboardDidHide'];

    const onShow = (event) => {
      const height = event.endCoordinates?.height ?? 0;
      if (height <= 0) return;
      keyboardFrameRef.current = { height };
      setKeyboardHeight(height);
      syncLift(layoutHeightRef.current, height);
    };

    const onHide = () => {
      keyboardFrameRef.current = null;
      setKeyboardHeight(0);
      setBottomLift(0);
    };

    const subs = [...showEvents.map((event) => Keyboard.addListener(event, onShow)), ...hideEvents.map((event) => Keyboard.addListener(event, onHide))];
    return () => subs.forEach((sub) => sub.remove());
  }, [syncLift]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.visualViewport) return undefined;

    const viewport = window.visualViewport;
    const syncViewport = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      const height = inset > 80 ? inset : 0;
      keyboardFrameRef.current = height > 0 ? { height } : null;
      setKeyboardHeight(height);
      syncLift(layoutHeightRef.current, height);
    };

    viewport.addEventListener('resize', syncViewport);
    viewport.addEventListener('scroll', syncViewport);
    return () => {
      viewport.removeEventListener('resize', syncViewport);
      viewport.removeEventListener('scroll', syncViewport);
    };
  }, [syncLift]);

  const imageHeight = width * MOBILE_IMAGE_RATIO;
  const imageTop = heroHeight > 0 ? Math.min(0, heroHeight - imageHeight * ARTWORK_ANCHOR_RATIO) : 0;
  const restingBottom = insets.bottom >= 40 ? insets.bottom : 20;
  const sheetBottom = keyboardHeight > 0 ? 32 : restingBottom;
  const mobilePadding = width >= 480 ? 28 : 22;

  return (
    <View className="flex-1 bg-white">
      {isPhone ? (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
          <View style={{ flex: 1, paddingBottom: bottomLift }} onLayout={onRootLayout}>
            <View style={{ flex: 1, overflow: 'hidden', backgroundColor: '#E6F4FE' }} onLayout={onHeroLayout}>
              <Image source={bgMobile} resizeMode="cover" accessibilityLabel="RichMonks illustration" style={{ position: 'absolute', left: 0, width, height: imageHeight, top: imageTop }} />
            </View>

            <View
              className="bg-white"
              style={{
                flexShrink: 0,
                marginTop: -28,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                paddingHorizontal: mobilePadding,
                paddingTop: 26,
                paddingBottom: sheetBottom,
                ...(Platform.OS === 'web'
                  ? { boxShadow: '0 -8px 16px rgba(15, 23, 42, 0.06)' }
                  : {
                      shadowColor: '#0F172A',
                      shadowOffset: { width: 0, height: -8 },
                      shadowOpacity: 0.06,
                      shadowRadius: 16,
                      elevation: 8,
                    }),
              }}
            >
              <SignupForm onSnackbar={snackbar.show} onLoadingChange={setIsLoading} />
            </View>
          </View>
        </SafeAreaView>
      ) : (
        <View style={{ flex: 1, width: '100%', height: '100%' }}>
          <Image source={bgWeb} resizeMode="cover" accessibilityLabel="RichMonks background" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} />
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <WideSignupCard onSnackbar={snackbar.show} onLoadingChange={setIsLoading} />
          </ScrollView>
        </View>
      )}
      <RMLoaderOverlay visible={isLoading} />
      <Snackbar message={snackbar.message} visible={snackbar.visible} onDismiss={snackbar.hide} />
    </View>
  );
}
