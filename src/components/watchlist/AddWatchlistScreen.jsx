import { memo, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Platform, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChevronRightIcon } from '@/components/icons/HomeIcons';
import { SearchIcon } from '@/components/icons/NavIcons';
import { RMLoader } from '@/components/RMLoader/RMLoader';
import Snackbar, { useSnackbar } from '@/components/Snackbar';
import { useCommonData } from '@/context/CommonDataContext';
import { watchlistApi } from '@/utils/api';

const ACCENT = '#0071A9';

function param(value) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function itemLabel(item) {
  if (typeof item === 'string') return item;
  return item?.symbol || item?.name || item?.script || item?.industry || '';
}

function AddWatchlistScreen() {
  const params = useLocalSearchParams();
  const type = param(params.type) || 'futures';
  const snackbar = useSnackbar();
  const { symbols, industries, nearExpiry, loading } = useCommonData();
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const source = type === 'industry' ? industries : symbols;
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const named = (source ?? []).map((item) => ({ raw: item, label: itemLabel(item) })).filter((item) => item.label);
    if (!q) return named;
    return named.filter((item) => item.label.toLowerCase().startsWith(q));
  }, [source, query]);

  const add = async (label) => {
    if (saving || !label) return;
    setSaving(true);
    try {
      const symbol = label;
      const body = type === 'industry'
        ? { symbol, script: symbol }
        : { symbol, script: type === 'options' ? `${symbol} OPT` : `${symbol} FUT`, strike_pr: 0, option_type: 'XX', expiry_dt: nearExpiry || '' };
      await watchlistApi.add(body);
      router.back();
    } catch (err) {
      snackbar.show(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/watchlist'))} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" style={[styles.backBtn, Platform.OS === 'web' ? styles.pointer : null]}>
          <View style={styles.backIcon}><ChevronRightIcon size={18} color="#64748B" /></View>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>Add to Watchlist</Text>
      </View>

      <View style={styles.searchBox}>
        <SearchIcon size={16} color="#94A3B8" />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search instruments" placeholderTextColor="#94A3B8" autoCorrect={false} autoCapitalize="characters" style={styles.searchInput} />
      </View>

      {loading ? (
        <View style={styles.center}><RMLoader /></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, index) => `${item.label}-${index}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={rows.length === 0 ? styles.emptyList : styles.listContent}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>No instruments to add.</Text></View>}
          renderItem={({ item }) => (
            <Pressable onPress={() => add(item.label)} disabled={saving} style={[styles.row, Platform.OS === 'web' ? styles.pointer : null]}>
              <Text style={styles.rowText}>{item.label}</Text>
              <Text style={styles.rowHint}>Add</Text>
            </Pressable>
          )}
        />
      )}

      <Snackbar message={snackbar.message} visible={snackbar.visible} onDismiss={snackbar.hide} />
    </SafeAreaView>
  );
}

export default memo(AddWatchlistScreen);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 20, paddingTop: 10, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  backIcon: { transform: [{ rotate: '180deg' }] },
  pointer: { cursor: 'pointer' },
  title: { flex: 1, fontSize: 17, lineHeight: 22, fontFamily: 'Inter_600SemiBold', color: '#0F172A', letterSpacing: -0.2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 12, height: 40, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0' },
  searchInput: { flex: 1, marginLeft: 8, padding: 0, fontSize: 14, fontFamily: 'Inter_400Regular', color: '#0F172A' },
  listContent: { paddingBottom: 16 },
  emptyList: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#94A3B8', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9' },
  rowText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#0F172A' },
  rowHint: { fontSize: 12, fontFamily: 'Inter_500Medium', color: ACCENT },
});
