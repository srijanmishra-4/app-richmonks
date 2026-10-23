import { memo, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, TextInput, View, useWindowDimensions } from 'react-native';
import { usePathname } from 'expo-router';

import { SearchIcon } from '@/components/icons/NavIcons';
import FnoSearchPanel, { useFnoSearch } from '@/components/search/FnoSearchPanel';
import { useFluidStyles } from '@/utils/responsive';

const webReset = Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0, boxShadow: 'none', borderWidth: 0 } : null;
const webBackdrop = { position: 'fixed', top: 60, left: 0, right: 0, bottom: 0, zIndex: 1, backgroundColor: 'transparent' };
const INPUT_ID = 'rm-desktop-symbol-query';

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

function HeaderSearch() {
  const search = useFnoSearch();
  const pathname = usePathname();
  const { height } = useWindowDimensions();
  const styles = useFluidStyles(createStyles);
  const inputRef = useRef(null);
  const seenPath = useRef(pathname);
  const [open, setOpen] = useState(false);
  const maxHeight = Math.max(120, Math.min(440, height - 80));

  useEffect(() => {
    setOpen(false);
    if (seenPath.current === pathname) return;
    seenPath.current = pathname;
    search.reset();
  }, [pathname, search.reset]);

  useEffect(() => { silenceBrowserSuggestions(INPUT_ID); }, []);

  useEffect(() => {
    if (!open || Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <SearchIcon size={16} color="#94A3B8" />
        <TextInput
          ref={inputRef}
          id={INPUT_ID}
          nativeID={INPUT_ID}
          value={search.query}
          onChangeText={search.onQueryChange}
          onFocus={() => { silenceBrowserSuggestions(INPUT_ID); setOpen(true); }}
          onTouchStart={() => setOpen(true)}
          placeholder="Search stocks, futures, options..."
          placeholderTextColor="#94A3B8"
          style={[styles.searchInput, webReset]}
          autoComplete="off"
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          importantForAutofill="no"
          textContentType="none"
          underlineColorAndroid="transparent"
        />
      </View>
      {open ? (
        <>
          <Pressable style={Platform.OS === 'web' ? webBackdrop : styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close search" />
          <View style={[styles.dropdownShadow, Platform.OS === 'web' ? { boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)' } : null, { maxHeight }]}>
            <View style={styles.dropdown}>
              <FnoSearchPanel search={search} variant="dropdown" maxHeight={maxHeight} />
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

export default memo(HeaderSearch);

const createStyles = (f) => ({
  searchContainer: {
    flex: 1,
    maxWidth: 580,
    marginHorizontal: 32,
    position: 'relative',
    zIndex: 5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 0,
    zIndex: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: f(13, 15),
    fontFamily: 'Inter_400Regular',
    color: '#0F172A',
    padding: 0,
    borderWidth: 0,
  },
  backdrop: {
    position: 'absolute',
    top: 44,
    left: -2000,
    width: 8000,
    height: 4000,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  dropdownShadow: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    zIndex: 4,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  dropdown: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
});
