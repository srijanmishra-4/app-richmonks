import { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, useNavigation, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronIcon } from '@/components/icons/CommonIcons';
import { SearchIcon } from '@/components/icons/NavIcons';
import FnoSearchPanel, { useFnoSearch } from '@/components/search/FnoSearchPanel';

const webReset = Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0, boxShadow: 'none', borderWidth: 0 } : null;
const pointer = Platform.OS === 'web' ? { cursor: 'pointer' } : null;
const INPUT_ID = 'rm-screen-symbol-query';

function silenceBrowserSuggestions(id) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const input = document.getElementById(id);
  if (!input) return;
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('spellcheck', 'false');
  input.spellcheck = false;
  input.setAttribute('aria-autocomplete', 'none');
  input.setAttribute('name', 'rm-fno-symbol-query');
}

export default function SearchScreen() {
  const search = useFnoSearch();
  const navigation = useNavigation();
  const pathname = usePathname();
  const seenPath = useRef(pathname);
  const insets = useSafeAreaInsets();
  const { stage, backToSymbols } = search;

  useEffect(() => { silenceBrowserSuggestions(INPUT_ID); }, []);

  useEffect(() => {
    if (seenPath.current === pathname) return;
    seenPath.current = pathname;
    search.reset();
  }, [pathname, search.reset]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (stage !== 'instruments') return;
      const type = event.data?.action?.type;
      if (type !== 'GO_BACK' && type !== 'POP' && type !== 'POP_TO_TOP') return;
      event.preventDefault();
      backToSymbols();
    });
    return unsubscribe;
  }, [navigation, stage, backToSymbols]);

  const onBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" style={[styles.backBtn, pointer]}>
          <ChevronIcon size={20} color="#64748B" direction="left" />
        </Pressable>
        <View style={styles.searchBox}>
          <SearchIcon size={16} color="#94A3B8" />
          <TextInput
            id={INPUT_ID}
            nativeID={INPUT_ID}
            value={search.query}
            onChangeText={search.onQueryChange}
            onFocus={() => silenceBrowserSuggestions(INPUT_ID)}
            placeholder="Search Futures Options"
            placeholderTextColor="#94A3B8"
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            importantForAutofill="no"
            textContentType="none"
            autoFocus
            underlineColorAndroid="transparent"
            style={[styles.input, webReset]}
          />
        </View>
      </View>
      <FnoSearchPanel search={search} variant="screen" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 16, paddingTop: 10, paddingBottom: 10, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 40, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 0 },
  input: { flex: 1, marginLeft: 8, padding: 0, fontSize: 14, fontFamily: 'Inter_400Regular', color: '#0F172A', borderWidth: 0 },
});
