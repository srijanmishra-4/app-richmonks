import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Image, ScrollView, Keyboard, Platform } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAuth } from '@/context/AuthContext';
import Snackbar, { useSnackbar } from '@/components/Snackbar';
import { RMLoaderOverlay } from '@/components/RMLoader/RMLoader';
import { authApi } from '@/utils/api';

const bgMobile2 = require('@/assets/rm-bg-mobile-2.png');
const bgWeb = require('@/assets/login-bg-web-2.png');
const rmIcon = require('@/assets/icon.png');

const MOBILE_IMAGE_RATIO = 1672 / 941;
const ARTWORK_ANCHOR_RATIO = 940 / 1672;
const RESEND_SECONDS = 30;
const OTP_LENGTH = 6;

// ─── Shared OTP Form ─────────────────────────────────────────────────────────

function OtpForm({ wide = false, phone, onEditNumber, onSnackbar, onLoadingChange }) {
  const { width } = useBreakpoint();
  const { signIn } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [error, setError] = useState('');
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);
  const timerRef = useRef(null);

  const size = (min, max) => {
    const minW = wide ? 768 : 320;
    const maxW = wide ? 1440 : 480;
    if (width <= minW) return min;
    if (width >= maxW) return max;
    return min + ((max - min) * (width - minW)) / (maxW - minW);
  };

  const buttonHeight = wide ? size(50, 54) : size(48, 52);
  const boxSize = wide ? size(44, 50) : size(46, 52);

  // Auto-focus first box (opens numeric keyboard on mobile)
  useEffect(() => {
    const delay = Platform.OS === 'ios' ? 400 : 200;
    const t = setTimeout(() => { inputRefs.current[0]?.focus(); }, delay);
    return () => clearTimeout(t);
  }, []);

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    setCountdown(RESEND_SECONDS);
    setCanResend(false);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); setCanResend(true); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => { startTimer(); return () => clearInterval(timerRef.current); }, [startTimer]);

  const handleResend = useCallback(async () => {
    if (!canResend || isResending) return;
    setIsResending(true);
    onLoadingChange?.(true);
    try {
      await authApi.resendOtp(phone);
      setOtp(Array(OTP_LENGTH).fill(''));
      setError('');
      startTimer();
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (e) {
      onSnackbar?.(e.message);
    } finally {
      setIsResending(false);
      onLoadingChange?.(false);
    }
  }, [canResend, isResending, phone, startTimer, onSnackbar, onLoadingChange]);

  const handleChangeText = useCallback((text, idx) => {
    const digits = text.replace(/[^0-9]/g, '');
    if (digits.length > 2) {
      const pasted = digits.slice(0, OTP_LENGTH - idx).split('');
      setOtp((prev) => { const next = [...prev]; pasted.forEach((d, i) => { next[idx + i] = d; }); return next; });
      inputRefs.current[Math.min(idx + pasted.length, OTP_LENGTH - 1)]?.focus();
      setError('');
      return;
    }
    const digit = digits.slice(-1);
    setOtp((prev) => { const next = [...prev]; next[idx] = digit; return next; });
    if (digit && idx < OTP_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
    if (digit) setError('');
  }, []);

  const handleKeyPress = useCallback(({ nativeEvent }, idx) => {
    if (nativeEvent.key === 'Backspace') {
      if (otp[idx] !== '') {
        setOtp((prev) => { const next = [...prev]; next[idx] = ''; return next; });
      } else if (idx > 0) {
        setOtp((prev) => { const next = [...prev]; next[idx - 1] = ''; return next; });
        inputRefs.current[idx - 1]?.focus();
      }
    }
  }, [otp]);

  const handleSubmit = useCallback(async () => {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) { setError('Please enter the complete 6-digit OTP'); return; }
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    onLoadingChange?.(true);
    try {
      const response = await authApi.verifyOtp(phone, code);
      // Flips the root route guard, which drops the auth screens from history and lands on Home.
      await signIn(response?.result);
    } catch (e) {
      onSnackbar?.(e.message);
      setIsSubmitting(false);
      onLoadingChange?.(false);
    }
  }, [otp, isSubmitting, phone, signIn, onSnackbar, onLoadingChange]);

  const timerLabel = `${String(Math.floor(countdown / 60)).padStart(2, '0')}:${String(countdown % 60).padStart(2, '0')}`;

  return (
    <View style={{ width: '100%' }}>
      <Text style={{ fontSize: size(wide ? 30 : 24, wide ? 36 : 28), fontFamily: 'Inter_700Bold', color: '#0F172A', letterSpacing: -0.5, marginBottom: 6 }}>
        6-digit code
      </Text>
      <Text style={{ fontSize: size(wide ? 14 : 13, wide ? 16 : 15), fontFamily: 'Inter_400Regular', color: '#64748B', lineHeight: size(wide ? 20 : 18, wide ? 24 : 22) }}>
        We have sent a verification code to your number
      </Text>

      {/* Phone number + edit */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: size(wide ? 28 : 22, wide ? 36 : 28) }}>
        <Text style={{ fontSize: size(wide ? 14 : 13, wide ? 16 : 15), fontFamily: 'Inter_600SemiBold', color: '#0F172A' }}>
          +91 {phone}
        </Text>
        <Pressable
          onPress={onEditNumber}
          accessibilityRole="button"
          accessibilityLabel="Edit phone number"
          id="otp-edit-number"
          style={{ marginLeft: 10, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : null) }}
        >
          <Text style={{ fontSize: size(12, 13), fontFamily: 'Inter_500Medium', color: '#2563EB' }}>✎ Edit</Text>
        </Pressable>
      </View>

      {/* 6 OTP boxes */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        {otp.map((digit, idx) => {
          const focused = focusedIdx === idx;
          const borderColor = error ? '#EF4444' : focused ? '#2563EB' : digit ? '#93C5FD' : '#E2E8F0';
          const ringColor = error ? 'rgba(239, 68, 68, 0.15)' : 'rgba(37, 99, 235, 0.15)';
          return (
            <TextInput
              key={idx}
              ref={(r) => { inputRefs.current[idx] = r; }}
              value={digit}
              onChangeText={(t) => handleChangeText(t, idx)}
              onKeyPress={(e) => handleKeyPress(e, idx)}
              onFocus={() => setFocusedIdx(idx)}
              onBlur={() => setFocusedIdx(-1)}
              keyboardType="number-pad"
              inputMode="numeric"
              autoComplete={idx === 0 ? 'one-time-code' : 'off'}
              textContentType={idx === 0 ? 'oneTimeCode' : 'none'}
              maxLength={idx === 0 ? OTP_LENGTH : 2}
              selectTextOnFocus
              textAlign="center"
              accessibilityLabel={`OTP digit ${idx + 1}`}
              id={`otp-digit-${idx + 1}`}
              style={{
                width: boxSize, height: boxSize,
                padding: 0,
                textAlign: 'center', textAlignVertical: 'center',
                borderRadius: 12, borderWidth: 1.5, borderColor,
                backgroundColor: focused ? '#FFFFFF' : digit ? '#F0F7FF' : '#F8FAFC',
                fontSize: size(wide ? 20 : 18, wide ? 24 : 22),
                fontFamily: 'Inter_700Bold', color: '#0F172A',
                ...(Platform.OS === 'web'
                  ? {
                    outlineStyle: 'none', outlineWidth: 0,
                    caretColor: '#2563EB',
                    boxShadow: focused || error ? `0 0 0 4px ${ringColor}` : '0 1px 2px rgba(15, 23, 42, 0.04)',
                    transitionProperty: 'border-color, box-shadow, background-color',
                    transitionDuration: '150ms',
                  }
                  : null),
              }}
            />
          );
        })}
      </View>

      {error ? (
        <Text style={{ fontSize: size(12, 13), fontFamily: 'Inter_400Regular', color: '#EF4444', marginBottom: 4 }} accessibilityRole="alert" id="otp-error">
          {error}
        </Text>
      ) : null}

      {/* Submit Button */}
      <Pressable
        onPress={handleSubmit}
        onPressIn={() => setIsButtonPressed(true)}
        onPressOut={() => setIsButtonPressed(false)}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: isButtonPressed ? '#1D4ED8' : '#2563EB', height: buttonHeight, marginTop: size(wide ? 24 : 20, wide ? 30 : 24), ...(Platform.OS === 'web' ? { cursor: 'pointer' } : null) }}
        accessibilityRole="button"
        accessibilityLabel="Submit OTP"
        id="otp-submit-button"
      >
        <Text style={{ fontSize: size(15, 16), fontFamily: 'Inter_600SemiBold', color: '#FFFFFF', marginRight: 8 }}>Submit</Text>
        <Text style={{ fontSize: size(16, 18), color: '#FFFFFF' }}>→</Text>
      </Pressable>

      {/* Resend */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: size(wide ? 20 : 16, wide ? 26 : 20), flexWrap: 'wrap' }}>
        <Text style={{ fontSize: size(13, 14), fontFamily: 'Inter_400Regular', color: '#64748B' }}>Didn't receive the code? </Text>
        <Pressable
          onPress={handleResend}
          disabled={!canResend}
          accessibilityRole="button"
          id="otp-resend-button"
          style={Platform.OS === 'web' ? { cursor: canResend ? 'pointer' : 'default' } : undefined}
        >
          <Text style={{ fontSize: size(13, 14), fontFamily: 'Inter_600SemiBold', color: canResend ? '#2563EB' : '#94A3B8' }}>
            Resend OTP {canResend ? '' : `(${timerLabel})`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Web: Wide OTP Card (right-aligned, same as Login/Signup web card) ───────

function WideOtpCard({ phone, onEditNumber, onSnackbar, onLoadingChange }) {
  return (
    <View
      style={{
        width: 440, maxWidth: '90%', alignSelf: 'flex-end', marginRight: '12%',
        backgroundColor: '#FFFFFF', borderRadius: 18, padding: 36,
        ...(Platform.OS === 'web'
          ? { boxShadow: '0 12px 32px rgba(15, 23, 42, 0.1)' }
          : { shadowColor: '#0F172A', shadowOpacity: 0.1, shadowRadius: 32, shadowOffset: { width: 0, height: 12 }, elevation: 8 }),
      }}
    >
      <OtpForm wide phone={phone} onEditNumber={onEditNumber} onSnackbar={onSnackbar} onLoadingChange={onLoadingChange} />
    </View>
  );
}

// ─── Root Screen ─────────────────────────────────────────────────────────────

export default function OtpScreen() {
  const { width, isPhone } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const phone = params.phone ?? '';

  const keyboardFrameRef = useRef(null);
  const layoutHeightRef = useRef(0);
  const closedLayoutRef = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [bottomLift, setBottomLift] = useState(0);
  const [heroHeight, setHeroHeight] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const snackbar = useSnackbar();

  const handleEditNumber = useCallback(() => { router.back(); }, []);

  const syncLift = useCallback((laidOut, kbHeight) => {
    if (kbHeight <= 0) { setBottomLift((c) => (c === 0 ? c : 0)); return; }
    const base = closedLayoutRef.current || laidOut;
    const shrink = Math.max(0, base - laidOut);
    const next = Math.max(0, kbHeight - shrink + 16);
    setBottomLift((c) => (c === next ? c : next));
  }, []);

  const onRootLayout = useCallback((e) => {
    const next = Math.round(e.nativeEvent.layout.height);
    layoutHeightRef.current = next;
    if (keyboardFrameRef.current == null) closedLayoutRef.current = next;
    syncLift(next, keyboardFrameRef.current?.height ?? 0);
  }, [syncLift]);

  const onHeroLayout = useCallback((e) => {
    const next = Math.round(e.nativeEvent.layout.height);
    setHeroHeight((c) => (c === next ? c : next));
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const showEvents = Platform.OS === 'ios' ? ['keyboardWillShow', 'keyboardDidShow'] : ['keyboardDidShow'];
    const hideEvents = Platform.OS === 'ios' ? ['keyboardWillHide', 'keyboardDidHide'] : ['keyboardDidHide'];
    const onShow = (e) => {
      const height = e.endCoordinates?.height ?? 0;
      if (height <= 0) return;
      keyboardFrameRef.current = { height };
      setKeyboardHeight(height);
      syncLift(layoutHeightRef.current, height);
    };
    const onHide = () => { keyboardFrameRef.current = null; setKeyboardHeight(0); setBottomLift(0); };
    const subs = [
      ...showEvents.map((ev) => Keyboard.addListener(ev, onShow)),
      ...hideEvents.map((ev) => Keyboard.addListener(ev, onHide)),
    ];
    // The login keyboard is often still up on arrival, and refocusing into the OTP box won't emit a new show event.
    if (Keyboard.isVisible()) {
      const metrics = Keyboard.metrics();
      if (metrics) onShow({ endCoordinates: metrics });
    }
    return () => subs.forEach((s) => s.remove());
  }, [syncLift]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.visualViewport) return undefined;
    const vp = window.visualViewport;
    const sync = () => {
      const inset = Math.max(0, window.innerHeight - vp.height - vp.offsetTop);
      const h = inset > 80 ? inset : 0;
      keyboardFrameRef.current = h > 0 ? { height: h } : null;
      setKeyboardHeight(h);
      syncLift(layoutHeightRef.current, h);
    };
    vp.addEventListener('resize', sync);
    vp.addEventListener('scroll', sync);
    return () => { vp.removeEventListener('resize', sync); vp.removeEventListener('scroll', sync); };
  }, [syncLift]);

  const imageHeight = width * MOBILE_IMAGE_RATIO;
  const imageTop = heroHeight > 0 ? Math.min(0, heroHeight - imageHeight * ARTWORK_ANCHOR_RATIO) : 0;
  const restingBottom = insets.bottom >= 40 ? insets.bottom : 20;
  const sheetBottom = keyboardHeight > 0 ? 32 : restingBottom;
  const mobilePadding = width >= 480 ? 28 : 22;

  if (!phone) return <Redirect href="/login" />;

  const overlayNodes = (
    <>
      <RMLoaderOverlay visible={isLoading} />
      <Snackbar message={snackbar.message} visible={snackbar.visible} onDismiss={snackbar.hide} />
    </>
  );

  // ── WEB ──────────────────────────────────────────────────────────────────
  if (!isPhone) {
    return (
      <View style={{ flex: 1, width: '100%', height: '100%' }}>
        <Image source={bgWeb} resizeMode="cover" accessibilityLabel="RichMonks background" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} />
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <WideOtpCard phone={phone} onEditNumber={handleEditNumber} onSnackbar={snackbar.show} onLoadingChange={setIsLoading} />
        </ScrollView>
        {overlayNodes}
      </View>
    );
  }

  // ── MOBILE ───────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#D6EAF8' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={{ flex: 1, paddingBottom: bottomLift }} onLayout={onRootLayout}>
          {/* Hero: rm-bg-mobile-2 with RM icon centered */}
          <View style={{ flex: 1, overflow: 'hidden', backgroundColor: '#D6EAF8' }} onLayout={onHeroLayout}>
            <Image
              source={bgMobile2}
              resizeMode="cover"
              accessibilityLabel="RichMonks illustration"
              style={{ position: 'absolute', left: 0, width, height: imageHeight, top: imageTop }}
            />
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              <Image
                source={rmIcon}
                resizeMode="contain"
                accessibilityLabel="RichMonks logo"
                style={{ width: 96, height: 96 }}
              />
            </View>
          </View>

          {/* White OTP content sheet */}
          <View
            style={{
              flexShrink: 0, marginTop: -28,
              borderTopLeftRadius: 28, borderTopRightRadius: 28,
              paddingHorizontal: mobilePadding, paddingTop: 26, paddingBottom: sheetBottom,
              backgroundColor: '#FFFFFF',
              ...(Platform.OS === 'web'
                ? { boxShadow: '0 -8px 16px rgba(15, 23, 42, 0.06)' }
                : { shadowColor: '#0F172A', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 8 }),
            }}
          >
            <OtpForm phone={phone} onEditNumber={handleEditNumber} onSnackbar={snackbar.show} onLoadingChange={setIsLoading} />
          </View>
        </View>
      </SafeAreaView>
      {overlayNodes}
    </View>
  );
}
