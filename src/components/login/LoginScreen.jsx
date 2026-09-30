import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Image, ScrollView, Keyboard, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import LoginForm from '@/components/login/LoginForm';
import Snackbar, { useSnackbar } from '@/components/Snackbar';
import { RMLoaderOverlay } from '@/components/RMLoader/RMLoader';
import { authApi } from '@/utils/api';

const bgMobile = require('@/assets/login-bg-mobile.png');
const bgWeb = require('@/assets/login-bg-web-2.png');

const MOBILE_IMAGE_RATIO = 1672 / 941;
// Point on the artwork that should meet the sheet when the keyboard shortens the hero (lap / coins).
const ARTWORK_ANCHOR_RATIO = 940 / 1672;

function WideLoginCard({ onSnackbar, onLoadingChange }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChangeText = useCallback((text) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 10);
    setPhoneNumber(digits);
    if (digits.length === 10) setError('');
  }, []);

  const handleGetOtp = useCallback(async () => {
    if (phoneNumber.length !== 10) {
      setError('Enter a valid number');
      return;
    }
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    onLoadingChange?.(true);
    try {
      await authApi.login(phoneNumber);
      router.push({ pathname: '/otp', params: { phone: phoneNumber } });
    } catch (e) {
      onSnackbar?.(e.message);
    } finally {
      setIsSubmitting(false);
      onLoadingChange?.(false);
    }
  }, [phoneNumber, isSubmitting, onSnackbar, onLoadingChange]);

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
      <Text style={{ fontSize: Math.min(40, 34), fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#0F172A' }}>Login</Text>
      <Text style={{ fontSize: Math.min(17, 15), fontFamily: 'Inter_400Regular', color: '#64748B', marginTop: 6 }}>To enter the App, begin with Login.</Text>
      <Text style={{ fontSize: Math.min(15, 14), fontWeight: '500', fontFamily: 'Inter_500Medium', color: '#334155', marginTop: 28, marginBottom: 8 }}>Enter Mobile Number</Text>
      <View collapsable={false}>
        <View className="flex-row items-center" style={{ height: 54, borderRadius: 10, borderWidth: 1.5, borderColor: error ? '#EF4444' : isFocused ? '#2563EB' : '#E2E8F0', backgroundColor: '#F8FAFC', paddingHorizontal: 18 }}>
          <View className="flex-row items-center">
            <Text style={{ fontSize: Math.min(17, 16), fontFamily: 'Inter_500Medium', color: '#0F172A' }}>+91</Text>
            <View style={{ width: 1, height: 26, backgroundColor: '#CBD5E1', marginLeft: 14, marginRight: 14 }} />
          </View>
          <TextInput
            style={{ flex: 1, fontSize: Math.min(17, 16), fontFamily: 'Inter_400Regular', color: '#0F172A', paddingVertical: 0, ...(Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } : null) }}
            placeholder="Mobile Number"
            placeholderTextColor="#94A3B8"
            value={phoneNumber}
            onChangeText={handleChangeText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={10}
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel="Mobile number input"
            id="phone-input"
          />
        </View>
        {error ? (
          <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#EF4444', marginTop: 6, marginLeft: 2 }} accessibilityRole="alert" id="phone-error">
            {error}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={handleGetOtp}
        onPressIn={() => setIsButtonPressed(true)}
        onPressOut={() => setIsButtonPressed(false)}
        className="flex-row items-center justify-center"
        style={{ width: '100%', height: 54, borderRadius: 10, backgroundColor: isButtonPressed ? '#1D4ED8' : '#2563EB', marginTop: 20, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : null) }}
        accessibilityRole="button"
        accessibilityLabel="Get OTP"
        id="get-otp-button"
      >
        <Text style={{ fontSize: Math.min(17, 16), fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#FFFFFF', marginRight: 8 }}>Get OTP</Text>
        <Text style={{ fontSize: Math.min(18, 16), color: '#FFFFFF' }}>→</Text>
      </Pressable>
      <View className="flex-row items-center justify-center" style={{ marginTop: 20, width: '100%' }}>
        <Text style={{ fontSize: Math.min(15, 14), fontFamily: 'Inter_400Regular', color: '#64748B' }}>Don't have an account? </Text>
        <Pressable onPress={() => router.push('/signup')} accessibilityRole="link" id="signup-link" style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}>
          <Text style={{ fontSize: Math.min(15, 14), fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#2563EB' }}>Signup</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function LoginScreen() {
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
    // Reported keyboard height stops short of the toolbar, so Signup stays under it.
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
              <LoginForm onSnackbar={snackbar.show} onLoadingChange={setIsLoading} />
            </View>
          </View>
        </SafeAreaView>
      ) : (
        <View style={{ flex: 1, width: '100%', height: '100%' }}>
          <Image source={bgWeb} resizeMode="cover" accessibilityLabel="RichMonks background" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} />
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <WideLoginCard onSnackbar={snackbar.show} onLoadingChange={setIsLoading} />
          </ScrollView>
        </View>
      )}
      <RMLoaderOverlay visible={isLoading} />
      <Snackbar message={snackbar.message} visible={snackbar.visible} onDismiss={snackbar.hide} />
    </View>
  );
}
