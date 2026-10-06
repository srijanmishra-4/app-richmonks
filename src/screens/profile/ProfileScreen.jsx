import { useCallback, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Platform, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { ChevronRightIcon } from '@/components/icons/HomeIcons';
import { getInitials } from '@/components/home/HomeHeader';
import ProfileHeader from '@/components/profile/ProfileHeader';
import { RMLoader } from '@/components/RMLoader/RMLoader';
import { useAuth } from '@/context/AuthContext';
import { profileApi } from '@/utils/api';
import { mapProfile, openExternal, PRIVACY_URL, sessionIdentity, TERMS_URL } from '@/components/profile/profileData';

const ACCENT = '#0071A9';
const DANGER = '#DC2626';
const pointer = Platform.OS === 'web' ? { cursor: 'pointer' } : null;

const MENUS = [
  { key: 'home', label: 'Home' },
  { key: 'learn', label: 'Learn' },
  { key: 'videos', label: 'Video Tutorials' },
  { key: 'support', label: 'Support' },
];

function PencilIcon({ size = 18, color = ACCENT }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 20h9" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LogoutIcon({ size = 18, color = DANGER }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 17l5-5-5-5" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 12H9" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function formatPhone(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2)}`;
  if (digits.length === 10) return `+91 ${digits}`;
  return raw;
}

function goHome() {
  router.dismissTo('/home');
}

function onMenu(key) {
  if (key === 'home') goHome();
}

export default function ProfileScreen() {
  const { user, token, updateUser, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const hasProfile = useRef(false);
  const userRef = useRef(user);
  userRef.current = user;

  useFocusEffect(useCallback(() => {
    let active = true;
    if (!hasProfile.current) setLoading(true);
    setError('');
    profileApi.get()
      .then(async (data) => {
        if (!active) return;
        const mapped = mapProfile(data);
        const stored = userRef.current;
        hasProfile.current = true;
        setProfile(mapped);
        const fields = {};
        if (mapped.name && mapped.name !== stored?.full_name) fields.full_name = mapped.name;
        if (mapped.email && mapped.email !== stored?.email) fields.email = mapped.email;
        if (mapped.contact && mapped.contact !== stored?.contact) fields.contact = mapped.contact;
        if (mapped.dob && mapped.dob !== stored?.dob) fields.dob = mapped.dob;
        if (Object.keys(fields).length) await updateUser(fields);
      })
      .catch((err) => { if (active) setError(err.message || 'Unable to load profile.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey, updateUser]));

  const session = sessionIdentity(user, token);
  const name = profile?.name || session.name;
  const email = profile?.email || session.email;
  const phone = formatPhone(profile?.contact || session.contact);
  const showLoader = loading && !profile && !name && !email && !phone;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ProfileHeader title="My Profile" onBack={goHome} />

      {showLoader ? (
        <View style={styles.loader}><RMLoader /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} bounces={false}>
          <View style={styles.hero}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar} accessibilityRole="image" accessibilityLabel={name || 'Profile'}>
                <Text style={styles.avatarText}>{getInitials(name)}</Text>
              </View>
            </View>
            {name ? <Text style={styles.name}>{name}</Text> : null}
            {email ? <Text style={styles.email}>{email}</Text> : null}
            {phone ? <Text style={styles.phone}>{phone}</Text> : null}
            {!loading && profile && !name && !email && !phone ? <Text style={styles.empty}>Profile details are not available.</Text> : null}
            {error ? (
              <Pressable onPress={() => setReloadKey((key) => key + 1)} style={pointer} accessibilityRole="button" accessibilityLabel="Try again">
                <Text style={styles.errorText}>{error}</Text>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable onPress={() => router.push('/profile/edit')} style={[styles.editRow, pointer]} accessibilityRole="button" accessibilityLabel="Edit Profile" id="profile-edit">
            <PencilIcon />
            <Text style={styles.editText}>Edit Profile</Text>
            <View style={styles.chevron}><ChevronRightIcon size={16} color="#94A3B8" /></View>
          </Pressable>

          <View style={styles.menus}>
            {MENUS.map((item) => (
              <Pressable key={item.key} onPress={() => onMenu(item.key)} style={[styles.menuRow, pointer]} accessibilityRole="button" accessibilityLabel={item.label} id={`profile-${item.key}`}>
                <Text style={styles.menuText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.spacer} />

          <Pressable onPress={signOut} style={[styles.logout, pointer]} accessibilityRole="button" accessibilityLabel="Logout" id="profile-logout">
            <LogoutIcon />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>

          <View style={styles.legalRow}>
            <Pressable onPress={() => openExternal(TERMS_URL)} hitSlop={8} style={pointer} accessibilityRole="link" id="profile-terms">
              <Text style={styles.link}>Terms Of Use</Text>
            </Pressable>
            <Pressable onPress={() => openExternal(PRIVACY_URL)} hitSlop={8} style={pointer} accessibilityRole="link" id="profile-privacy">
              <Text style={styles.link}>Privacy Policy</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  page: { flexGrow: 1 },
  hero: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 32, paddingBottom: 28 },
  avatarRing: { width: 104, height: 104, borderRadius: 52, backgroundColor: '#E8F4FB', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF', letterSpacing: 0.4 },
  name: { marginTop: 16, fontSize: 22, lineHeight: 28, fontFamily: 'Inter_600SemiBold', color: '#0F172A', textAlign: 'center', letterSpacing: -0.4 },
  email: { marginTop: 6, fontSize: 14, lineHeight: 20, fontFamily: 'Inter_400Regular', color: '#64748B', textAlign: 'center' },
  phone: { marginTop: 2, fontSize: 14, lineHeight: 20, fontFamily: 'Inter_400Regular', color: '#64748B', textAlign: 'center' },
  empty: { marginTop: 12, fontSize: 13, lineHeight: 18, fontFamily: 'Inter_400Regular', color: '#94A3B8', textAlign: 'center' },
  errorText: { marginTop: 14, fontSize: 13, lineHeight: 18, fontFamily: 'Inter_400Regular', color: '#64748B', textAlign: 'center' },
  retryText: { marginTop: 4, fontSize: 13, fontFamily: 'Inter_600SemiBold', color: ACCENT, textAlign: 'center' },
  editRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 20, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0' },
  editText: { flex: 1, marginLeft: 14, fontSize: 15, fontFamily: 'Inter_500Medium', color: '#0F172A' },
  chevron: { marginLeft: 12 },
  menus: { paddingTop: 8 },
  menuRow: { paddingHorizontal: 20, paddingVertical: 14 },
  menuText: { fontSize: 15, lineHeight: 20, fontFamily: 'Inter_500Medium', color: '#0F172A' },
  spacer: { flexGrow: 1, minHeight: 32 },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  logoutText: { marginLeft: 8, fontSize: 15, fontFamily: 'Inter_600SemiBold', color: DANGER },
  legalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, marginTop: 28, paddingBottom: 16 },
  link: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter_500Medium', color: ACCENT },
});
