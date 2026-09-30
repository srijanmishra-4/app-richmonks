import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import { authApi } from '@/utils/api';

function fluid(width, min, max, minW, maxW) {
  if (width <= minW) return min;
  if (width >= maxW) return max;
  return min + ((max - min) * (width - minW)) / (maxW - minW);
}


export default function LoginForm({ wide = false, onInputFocus, onSnackbar, onLoadingChange }) {
  const { width } = useBreakpoint();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const size = (min, max) =>
    wide ? fluid(width, min, max, 768, 1440) : fluid(width, min, max, 320, 480);

  const inputHeight = wide ? size(52, 56) : size(50, 54);
  const buttonHeight = wide ? size(50, 54) : size(48, 52);

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
      await new Promise((resolve) => setTimeout(resolve, 5000));
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
    <View className="w-full">
      <Text style={{ fontSize: size(wide ? 30 : 26, wide ? 36 : 30), fontFamily: 'Inter_700Bold', color: '#0F172A', letterSpacing: -0.5, marginBottom: 6 }}>
        Login
      </Text>

      <Text style={{ fontSize: size(wide ? 14 : 13, wide ? 16 : 15), fontFamily: 'Inter_400Regular', color: '#64748B', lineHeight: size(wide ? 20 : 18, wide ? 24 : 22), marginBottom: size(wide ? 28 : 22, wide ? 36 : 28) }}>
        To enter the App, begin with Login.
      </Text>

      <Text style={{ fontSize: size(13, 14), fontFamily: 'Inter_500Medium', color: '#334155', marginBottom: 8 }}>
        Enter Mobile Number
      </Text>

      <View collapsable={false}>
        <View className="flex-row items-center" style={{ borderRadius: 12, borderWidth: 1.5, borderColor: error ? '#EF4444' : isFocused ? '#2563EB' : '#E2E8F0', backgroundColor: '#F8FAFC', paddingHorizontal: wide ? 16 : 14, height: inputHeight }}>
          <View className="flex-row items-center">
            <Text style={{ fontSize: size(15, 16), fontFamily: 'Inter_500Medium', color: '#0F172A', marginLeft: 8 }}>+91</Text>
            <View style={{ width: 1, height: wide ? 24 : 22, backgroundColor: '#CBD5E1', marginLeft: 12, marginRight: 12 }} />
          </View>

          <TextInput
            style={{ flex: 1, fontSize: size(15, 16), fontFamily: 'Inter_400Regular', color: '#0F172A', paddingVertical: 0, ...(Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } : null) }}
            placeholder="Mobile Number"
            placeholderTextColor="#94A3B8"
            value={phoneNumber}
            onChangeText={handleChangeText}
            onFocus={() => { setIsFocused(true); onInputFocus?.(); }}
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
          <Text style={{ fontSize: size(12, 13), fontFamily: 'Inter_400Regular', color: '#EF4444', marginTop: 6, marginLeft: 2 }} accessibilityRole="alert" id="phone-error">
            {error}
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={handleGetOtp}
        onPressIn={() => setIsButtonPressed(true)}
        onPressOut={() => setIsButtonPressed(false)}
        className="flex-row items-center justify-center"
        style={{ borderRadius: 12, backgroundColor: isButtonPressed ? '#1D4ED8' : '#2563EB', height: buttonHeight, marginTop: size(wide ? 24 : 20, wide ? 30 : 24), ...(Platform.OS === 'web' ? { cursor: 'pointer' } : null) }}
        accessibilityRole="button"
        accessibilityLabel="Get OTP"
        id="get-otp-button"
      >
        <Text style={{ fontSize: size(15, 16), fontFamily: 'Inter_600SemiBold', color: '#FFFFFF', marginRight: 8 }}>Get OTP</Text>
        <Text style={{ fontSize: size(16, 18), color: '#FFFFFF' }}>→</Text>
      </Pressable>

      <View className="flex-row items-center justify-center" style={{ marginTop: size(wide ? 22 : 18, wide ? 28 : 24) }}>
        <Text style={{ fontSize: size(13, 14), fontFamily: 'Inter_400Regular', color: '#64748B' }}>
          Don't have an account?{' '}
        </Text>
        <Pressable onPress={() => router.push('/signup')} accessibilityRole="link" id="signup-link" style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}>
          <Text style={{ fontSize: size(13, 14), fontFamily: 'Inter_600SemiBold', color: '#2563EB' }}>Signup</Text>
        </Pressable>
      </View>
    </View>
  );
}
