import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, Platform, Linking } from 'react-native';
import { router } from 'expo-router';
import DobPicker from '@/components/signup/DobPicker';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import { authApi } from '@/utils/api';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const TERMS_URL = 'https://www.richmonks.in/terms-of-use';
const SIGNUP_PLATFORM = Platform.select({ android: 'google', ios: 'apple', default: '' });

function fluid(width, min, max, minW, maxW) {
  if (width <= minW) return min;
  if (width >= maxW) return max;
  return min + ((max - min) * (width - minW)) / (maxW - minW);
}

function CalendarIcon({ size = 20, color = '#64748B' }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: size * 0.85, height: size * 0.8, borderRadius: 2, borderWidth: 1.5, borderColor: color, marginTop: size * 0.1 }}>
        <View style={{ height: size * 0.22, backgroundColor: color, borderTopLeftRadius: 1, borderTopRightRadius: 1 }} />
      </View>
      {/* Calendar handles */}
      <View style={{ position: 'absolute', top: 0, left: size * 0.22, width: 1.5, height: size * 0.18, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ position: 'absolute', top: 0, left: size * 0.62, width: 1.5, height: size * 0.18, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

function CheckboxIcon({ checked, size = 20 }) {
  return (
    <View style={{ width: size, height: size, borderRadius: 4, borderWidth: 1.5, borderColor: checked ? '#2563EB' : '#CBD5E1', backgroundColor: checked ? '#2563EB' : '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
      {checked ? <Text style={{ color: '#FFFFFF', fontSize: size * 0.65, lineHeight: size * 0.75, fontWeight: '700' }}>✓</Text> : null}
    </View>
  );
}

function formatDate(date) {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function toApiDate(date) {
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export default function SignupForm({ wide = false, onInputFocus, onSnackbar, onLoadingChange }) {
  const { width } = useBreakpoint();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dob, setDob] = useState(null);
  const [dobDisplay, setDobDisplay] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const size = (min, max) =>
    wide ? fluid(width, min, max, 768, 1440) : fluid(width, min, max, 320, 480);

  const inputHeight = wide ? size(52, 56) : size(50, 54);
  const buttonHeight = wide ? size(50, 54) : size(48, 52);

  const handleFullNameChange = useCallback((text) => {
    const sanitized = text.replace(/[^a-zA-Z\s]/g, '');
    setFullName(sanitized);
    if (sanitized.trim().length > 0) setErrors((prev) => ({ ...prev, fullName: '' }));
  }, []);

  const handleEmailChange = useCallback((text) => {
    setEmail(text);
    if (EMAIL_REGEX.test(text.trim())) setErrors((prev) => ({ ...prev, email: '' }));
  }, []);

  const handlePhoneChange = useCallback((text) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 10);
    setPhoneNumber(digits);
    if (digits.length === 10) setErrors((prev) => ({ ...prev, phone: '' }));
  }, []);

  const handleSelectDate = useCallback((selectedDate) => {
    setDob(selectedDate);
    setDobDisplay(formatDate(selectedDate));
    setErrors((prev) => ({ ...prev, dob: '' }));
  }, []);

  const openTermsLink = useCallback(() => {
    if (Platform.OS === 'web') {
      window.open(TERMS_URL, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(TERMS_URL);
    }
  }, []);

  const handleGetOtp = useCallback(async () => {
    const newErrors = {};
    let hasFieldError = false;

    // Full Name
    if (!fullName.trim()) {
      newErrors.fullName = 'Enter your full name';
      hasFieldError = true;
    }

    // Email
    if (!email.trim()) {
      newErrors.email = 'Enter your email address';
      hasFieldError = true;
    } else if (!EMAIL_REGEX.test(email.trim())) {
      newErrors.email = 'Enter a valid email address';
      hasFieldError = true;
    }

    // Phone
    if (!phoneNumber || phoneNumber.length !== 10) {
      newErrors.phone = 'Enter a valid 10-digit mobile number';
      hasFieldError = true;
    }

    // DOB
    if (!dob) {
      newErrors.dob = 'Select your date of birth';
      hasFieldError = true;
    }

    setErrors(newErrors);

    if (hasFieldError) return;

    // Checkbox validations
    // if (!acceptTerms && !whatsappOtp) {
    //   onSnackbar?.('Please accept Terms and Conditions and agree to receive OTP on WhatsApp');
    //   return;
    // }
    if (!acceptTerms) {
      onSnackbar?.('Please accept Terms and Conditions');
      return;
    }
    // if (!whatsappOtp) {
    //   onSnackbar?.('Please agree to receive OTP on WhatsApp');
    //   return;
    // }

    if (isSubmitting) return;
    setIsSubmitting(true);
    onLoadingChange?.(true);
    try {
      await authApi.signup({ full_name: fullName.trim(), email: email.trim(), mobile: phoneNumber, dob: toApiDate(dob), platform: SIGNUP_PLATFORM });
      router.push({ pathname: '/otp', params: { phone: phoneNumber } });
    } catch (e) {
      onSnackbar?.(e.message);
    } finally {
      setIsSubmitting(false);
      onLoadingChange?.(false);
    }
  }, [fullName, email, phoneNumber, dob, acceptTerms, isSubmitting, onSnackbar, onLoadingChange]);

  const fieldGap = size(wide ? 14 : 12, wide ? 18 : 16);

  const inputStyle = (field) => ({
    borderRadius: 12, borderWidth: 1.5,
    borderColor: errors[field] ? '#EF4444' : focusedField === field ? '#2563EB' : '#E2E8F0',
    backgroundColor: '#F8FAFC', paddingHorizontal: wide ? 16 : 14, height: inputHeight,
  });

  const textInputStyle = {
    flex: 1, fontSize: size(15, 16), fontFamily: 'Inter_400Regular', color: '#0F172A', paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } : null),
  };

  const labelStyle = { fontSize: size(13, 14), fontFamily: 'Inter_500Medium', color: '#334155', marginBottom: 8 };
  const errorTextStyle = { fontSize: size(12, 13), fontFamily: 'Inter_400Regular', color: '#EF4444', marginTop: 6, marginLeft: 2 };

  return (
    <View className="w-full">
      <Text style={{ fontSize: size(wide ? 30 : 26, wide ? 36 : 30), fontFamily: 'Inter_700Bold', color: '#0F172A', letterSpacing: -0.5, marginBottom: 6 }}>
        Signup
      </Text>

      <Text style={{ fontSize: size(wide ? 14 : 13, wide ? 16 : 15), fontFamily: 'Inter_400Regular', color: '#64748B', lineHeight: size(wide ? 20 : 18, wide ? 24 : 22), marginBottom: size(wide ? 24 : 18, wide ? 30 : 24) }}>
        We need some details to know you better.
      </Text>

      {/* Full Name */}
      <Text style={labelStyle}>Full Name</Text>
      <View collapsable={false}>
        <View className="flex-row items-center" style={inputStyle('fullName')}>
          <TextInput
            style={textInputStyle}
            placeholder="Enter your full name"
            placeholderTextColor="#94A3B8"
            value={fullName}
            onChangeText={handleFullNameChange}
            onFocus={() => { setFocusedField('fullName'); onInputFocus?.(); }}
            onBlur={() => setFocusedField(null)}
            autoCorrect={false}
            autoCapitalize="words"
            accessibilityLabel="Full name input"
            id="fullname-input"
          />
        </View>
        {errors.fullName ? <Text style={errorTextStyle} accessibilityRole="alert">{errors.fullName}</Text> : null}
      </View>

      {/* Email */}
      <Text style={{ ...labelStyle, marginTop: fieldGap }}>Email</Text>
      <View collapsable={false}>
        <View className="flex-row items-center" style={inputStyle('email')}>
          <TextInput
            style={textInputStyle}
            placeholder="Enter your email address"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={handleEmailChange}
            onFocus={() => { setFocusedField('email'); onInputFocus?.(); }}
            onBlur={() => setFocusedField(null)}
            keyboardType="email-address"
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel="Email input"
            id="email-input"
          />
        </View>
        {errors.email ? <Text style={errorTextStyle} accessibilityRole="alert">{errors.email}</Text> : null}
      </View>

      {/* Mobile Number */}
      <Text style={{ ...labelStyle, marginTop: fieldGap }}>Mobile Number</Text>
      <View collapsable={false}>
        <View className="flex-row items-center" style={inputStyle('phone')}>
          <View className="flex-row items-center">
            <Text style={{ fontSize: size(15, 16), fontFamily: 'Inter_500Medium', color: '#0F172A', marginLeft: 6 }}>+91</Text>
            <View style={{ width: 1, height: wide ? 24 : 22, backgroundColor: '#CBD5E1', marginLeft: 10, marginRight: 12 }} />
          </View>
          <TextInput
            style={textInputStyle}
            placeholder="Enter your mobile number"
            placeholderTextColor="#94A3B8"
            value={phoneNumber}
            onChangeText={handlePhoneChange}
            onFocus={() => { setFocusedField('phone'); onInputFocus?.(); }}
            onBlur={() => setFocusedField(null)}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={10}
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel="Mobile number input"
            id="signup-phone-input"
          />
        </View>
        {errors.phone ? <Text style={errorTextStyle} accessibilityRole="alert">{errors.phone}</Text> : null}
      </View>

      {/* Date of Birth */}
      <Text style={{ ...labelStyle, marginTop: fieldGap }}>Date of Birth</Text>
      <View collapsable={false}>
        <DobPicker
          dob={dob}
          dobDisplay={dobDisplay}
          onSelectDate={handleSelectDate}
          inputStyle={inputStyle('dob')}
          textInputStyle={textInputStyle}
          wide={wide}
          onInputFocus={onInputFocus}
          CalendarIcon={CalendarIcon}
        />
        {errors.dob ? <Text style={errorTextStyle} accessibilityRole="alert">{errors.dob}</Text> : null}
      </View>

      {/* Checkboxes */}
      <View style={{ marginTop: size(wide ? 18 : 14, wide ? 22 : 18) }}>
        {/* Accept Terms */}
        <Pressable onPress={() => setAcceptTerms((prev) => !prev)} style={{ flexDirection: 'row', alignItems: 'center', ...(Platform.OS === 'web' ? { cursor: 'pointer' } : null) }} accessibilityRole="checkbox" accessibilityState={{ checked: acceptTerms }} id="terms-checkbox">
          <CheckboxIcon checked={acceptTerms} size={wide ? 20 : 18} />
          <Text style={{ fontSize: size(13, 14), fontFamily: 'Inter_400Regular', color: '#334155', marginLeft: 10 }}>
            Accept{' '}
          </Text>
          <Pressable onPress={openTermsLink} style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined} id="terms-link">
            <Text style={{ fontSize: size(13, 14), fontFamily: 'Inter_500Medium', color: '#2563EB', textDecorationLine: 'underline' }}>Terms and Conditions</Text>
          </Pressable>
        </Pressable>

        {/* Get OTP on WhatsApp */}
        {/* <Pressable onPress={() => setWhatsappOtp((prev) => !prev)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: size(10, 12), ...(Platform.OS === 'web' ? { cursor: 'pointer' } : null) }} accessibilityRole="checkbox" accessibilityState={{ checked: whatsappOtp }} id="whatsapp-checkbox">
          <CheckboxIcon checked={whatsappOtp} size={wide ? 20 : 18} />
          <Text style={{ fontSize: size(13, 14), fontFamily: 'Inter_400Regular', color: '#334155', marginLeft: 10 }}>Get OTP on WhatsApp</Text>
        </Pressable> */}
      </View>

      {/* Get OTP Button */}
      <Pressable
        onPress={handleGetOtp}
        onPressIn={() => setIsButtonPressed(true)}
        onPressOut={() => setIsButtonPressed(false)}
        className="flex-row items-center justify-center"
        style={{ borderRadius: 12, backgroundColor: isButtonPressed ? '#1D4ED8' : '#2563EB', height: buttonHeight, marginTop: size(wide ? 24 : 20, wide ? 30 : 24), ...(Platform.OS === 'web' ? { cursor: 'pointer' } : null) }}
        accessibilityRole="button"
        accessibilityLabel="Get OTP"
        id="signup-get-otp-button"
      >
        <Text style={{ fontSize: size(15, 16), fontFamily: 'Inter_600SemiBold', color: '#FFFFFF', marginRight: 8 }}>Get OTP</Text>
        <Text style={{ fontSize: size(16, 18), color: '#FFFFFF' }}>→</Text>
      </Pressable>

      {/* Bottom link */}
      <View className="flex-row items-center justify-center" style={{ marginTop: size(wide ? 22 : 18, wide ? 28 : 24) }}>
        <Text style={{ fontSize: size(13, 14), fontFamily: 'Inter_400Regular', color: '#64748B' }}>
          Already have an account?{' '}
        </Text>
        <Pressable
          onPress={() => router.push('/login')}
          accessibilityRole="link"
          id="login-link"
          style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}
        >
          <Text style={{ fontSize: size(13, 14), fontFamily: 'Inter_600SemiBold', color: '#2563EB' }}>Login</Text>
        </Pressable>
      </View>
    </View>
  );
}
