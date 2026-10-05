import { memo } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChevronRightIcon } from '@/components/icons/HomeIcons';

const GREEN = '#16A34A';
const RED = '#DC2626';
const NEUTRAL = '#64748B';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function param(value) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function groupDigits(intPart) {
  if (intPart.length <= 3) return intPart;
  return `${intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${intPart.slice(-3)}`;
}

function formatPrice(val) {
  if (val == null || val === '') return '—';
  const num = parseFloat(String(val).replace(/,/g, ''));
  if (!Number.isFinite(num)) return '—';
  const [intPart, dec] = Math.abs(num).toFixed(2).split('.');
  return `${num < 0 ? '-' : ''}₹${groupDigits(intPart)}.${dec}`;
}

function formatExpiry(value) {
  const str = String(value || '').trim();
  if (!str.includes('-')) return str || '—';
  const parts = str.split('-');
  if (parts.length !== 3) return str;
  const day = parseInt(parts[0].length === 4 ? parts[2] : parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  if (!Number.isFinite(day) || monthIdx < 0 || monthIdx > 11) return str;
  return `${day} ${MONTHS[monthIdx]}`;
}

function formatChange(val) {
  const num = parseFloat(String(val ?? '').replace(/[₹,()%\s]/g, ''));
  if (!Number.isFinite(num)) return val || '—';
  const signed = typeof val === 'string' && val.includes('-') && num > 0 ? -num : num;
  return `${signed > 0 ? '+' : signed < 0 ? '-' : ''}${Math.abs(signed).toFixed(2)}%`;
}

function Row({ label, value, color }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, color ? { color } : null]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function InstrumentProfileScreen({ title }) {
  const params = useLocalSearchParams();
  const script = param(params.script);
  const symbol = param(params.symbol);
  const expiry = param(params.expiry_dt);
  const price = param(params.price);
  const change = param(params.price_change);
  const optionType = param(params.option_type);
  const strike = param(params.strike_pr);
  const changeNum = parseFloat(String(change).replace(/[₹,()%\s]/g, ''));
  const signed = String(change).includes('-') && changeNum > 0 ? -changeNum : changeNum;
  const changeColor = signed > 0 ? GREEN : signed < 0 ? RED : NEUTRAL;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/watchlist'))} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" style={[styles.backBtn, Platform.OS === 'web' ? styles.pointer : null]}>
          <View style={styles.backIcon}><ChevronRightIcon size={18} color="#64748B" /></View>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.script}>{script || symbol || '—'}</Text>
        {symbol ? <Text style={styles.symbol}>{symbol}</Text> : null}
        <Row label="Price" value={formatPrice(price)} />
        <Row label="Change" value={formatChange(change)} color={changeColor} />
        <Row label="Expiry" value={formatExpiry(expiry)} />
        {optionType && optionType !== 'XX' ? <Row label="Option Type" value={optionType} /> : null}
        {strike && strike !== '0' ? <Row label="Strike" value={formatPrice(strike)} /> : null}
      </View>
    </SafeAreaView>
  );
}

export default memo(InstrumentProfileScreen);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 20, paddingTop: 10, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  backIcon: { transform: [{ rotate: '180deg' }] },
  pointer: { cursor: 'pointer' },
  title: { flex: 1, fontSize: 17, lineHeight: 22, fontFamily: 'Inter_600SemiBold', color: '#0F172A', letterSpacing: -0.2 },
  card: { margin: 16, padding: 16, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
  script: { fontSize: 18, lineHeight: 24, fontFamily: 'Inter_700Bold', color: '#0F172A' },
  symbol: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#64748B', marginTop: 2, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F1F5F9' },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#94A3B8' },
  value: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
});
