import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Platform, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import DobPicker from '@/components/signup/DobPicker';
import ProfileHeader from '@/components/profile/ProfileHeader';
import { RMLoader } from '@/components/RMLoader/RMLoader';
import Snackbar, { useSnackbar } from '@/components/Snackbar';
import { useAuth } from '@/context/AuthContext';
import { profileApi } from '@/utils/api';
import { formatDob, isValidEmail, mapProfile, parseDob, toApiDob } from '@/components/profile/profileData';

const ACCENT = '#0071A9';
const pointer = Platform.OS === 'web' ? { cursor: 'pointer' } : null;

function CalendarIcon({ size = 18, color = '#64748B' }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: size * 0.85, height: size * 0.8, borderRadius: 2, borderWidth: 1.5, borderColor: color, marginTop: size * 0.1 }}>
        <View style={{ height: size * 0.22, backgroundColor: color, borderTopLeftRadius: 1, borderTopRightRadius: 1 }} />
      </View>
      <View style={{ position: 'absolute', top: 0, left: size * 0.22, width: 1.5, height: size * 0.18, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ position: 'absolute', top: 0, left: size * 0.62, width: 1.5, height: size * 0.18, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

function formatContact(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2)}`;
  if (digits.length === 10) return `+91 ${digits}`;
  return String(value);
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/profile');
}

export default function EditProfileScreen() {
  const { user, updateUser } = useAuth();
  const userRef = useRef(user);
  const snackbar = useSnackbar();
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [dob, setDob] = useState(null);
  const [focused, setFocused] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let active = true;
    const apply = (mapped) => {
      const stored = userRef.current;
      setFullName(mapped?.name || stored?.full_name || '');
      setEmail(mapped?.email || stored?.email || '');
      setContact(mapped?.contact || stored?.contact || '');
      setDob(parseDob(mapped?.dob || stored?.dob));
    };
    profileApi.get()
      .then((data) => { if (active) apply(mapProfile(data)); })
      .catch((err) => {
        if (!active) return;
        apply(null);
        snackbar.show(err.message);
      })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [snackbar.show]);

  const save = async () => {
    const nextErrors = {};
    if (!fullName.trim()) nextErrors.fullName = 'Enter your full name';
    if (!email.trim()) nextErrors.email = 'Enter your email address';
    else if (!isValidEmail(email)) nextErrors.email = 'Enter a valid email address';
    if (!dob) nextErrors.dob = 'Select your date of birth';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || saving) return;

    const body = { full_name: fullName.trim(), email: email.trim(), dob: toApiDob(dob) };
    setSaving(true);
    try {
      const mapped = mapProfile(await profileApi.update(body));
      await updateUser({
        full_name: mapped.name || body.full_name,
        email: mapped.email || body.email,
        dob: mapped.dob || body.dob,
        contact: mapped.contact || contact,
      });
      goBack();
    } catch (err) {
      snackbar.show(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = (field) => ({
    ...styles.input,
    borderColor: errors[field] ? '#EF4444' : focused === field ? ACCENT : '#E2E8F0',
  });

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ProfileHeader title="Edit Profile" onBack={goBack} id="edit-profile-back" />
      {!ready ? (
        <View style={styles.loader}><RMLoader /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[styles.label, styles.labelFirst]}>Full Name</Text>
          <TextInput value={fullName} onChangeText={(text) => { setFullName(text.replace(/[^a-zA-Z\s]/g, '')); setErrors((prev) => ({ ...prev, fullName: '' })); }} onFocus={() => setFocused('fullName')} onBlur={() => setFocused(null)} placeholder="Enter your full name" placeholderTextColor="#94A3B8" autoCorrect={false} autoCapitalize="words" style={inputStyle('fullName')} accessibilityLabel="Full name" id="edit-name" />
          {errors.fullName ? <Text style={styles.error}>{errors.fullName}</Text> : null}

          <Text style={styles.label}>Email</Text>
          <TextInput value={email} onChangeText={(text) => { setEmail(text); setErrors((prev) => ({ ...prev, email: '' })); }} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} placeholder="Enter your email address" placeholderTextColor="#94A3B8" keyboardType="email-address" autoCorrect={false} autoCapitalize="none" style={inputStyle('email')} accessibilityLabel="Email" id="edit-email" />
          {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}

          {contact ? (
            <>
              <Text style={styles.label}>Mobile Number</Text>
              <View style={styles.locked}><Text style={styles.lockedText}>{formatContact(contact)}</Text></View>
            </>
          ) : null}

          <Text style={styles.label}>Date of Birth</Text>
          <DobPicker dob={dob} dobDisplay={formatDob(dob)} onSelectDate={(date) => { setDob(date); setErrors((prev) => ({ ...prev, dob: '' })); }} inputStyle={inputStyle('dob')} textInputStyle={styles.dobText} CalendarIcon={CalendarIcon} />
          {errors.dob ? <Text style={styles.error}>{errors.dob}</Text> : null}

          <Pressable onPress={save} disabled={saving} style={[styles.save, saving && styles.saveDisabled, pointer]} accessibilityRole="button" accessibilityLabel="Save profile" id="edit-profile-save">
            <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
          </Pressable>
        </ScrollView>
      )}
      <Snackbar message={snackbar.message} visible={snackbar.visible} onDismiss={snackbar.hide} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  form: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
  label: { marginTop: 16, marginBottom: 8, fontSize: 13, fontFamily: 'Inter_500Medium', color: '#334155' },
  labelFirst: { marginTop: 0 },
  input: { height: 48, borderRadius: 12, borderWidth: 1.5, backgroundColor: '#F8FAFC', paddingHorizontal: 14, fontSize: 15, fontFamily: 'Inter_400Regular', color: '#0F172A', ...(Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } : null) },
  error: { marginTop: 6, fontSize: 12, fontFamily: 'Inter_400Regular', color: '#EF4444' },
  locked: { height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', paddingHorizontal: 14, justifyContent: 'center' },
  lockedText: { fontSize: 15, fontFamily: 'Inter_400Regular', color: '#64748B' },
  dobText: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular', color: '#0F172A', paddingVertical: 0 },
  save: { marginTop: 28, height: 48, borderRadius: 12, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  saveDisabled: { opacity: 0.7 },
  saveText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
});
