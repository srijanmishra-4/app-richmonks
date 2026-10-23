import { memo, useCallback, useEffect, useRef } from 'react';
import { View, Pressable, Text, Animated, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';

/**
 * Right-side drawer overlay for desktop report screens.
 * Renders a backdrop that covers the main content area (not watchlist/top nav)
 * and slides the report in from the right edge.
 */
function ReportDrawer({ children }) {
  const slideAnim = useRef(new Animated.Value(1)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 280, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [slideAnim, backdropAnim]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: Platform.OS !== 'web' }),
    ]).start(() => {
      if (router.canGoBack()) router.back();
      else router.replace('/home');
    });
  }, [slideAnim, backdropAnim]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); handleClose(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handleClose]);

  const backdropOpacity = backdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  return (
    <View style={styles.overlay}>
      {/* Backdrop — blocks interaction with Home underneath */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} pointerEvents="auto">
        <Pressable style={StyleSheet.absoluteFill} onPress={() => { }} />
      </Animated.View>
      {/* Drawer panel sliding from right */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 900] }) }] }]}>

        <View style={styles.drawerContent}>{children}</View>
      </Animated.View>
    </View>
  );
}

export default memo(ReportDrawer);

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 50, flexDirection: 'row', justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0F172A' },
  drawer: { width: '60%', maxWidth: 750, height: '100%', backgroundColor: '#F6F7F8', borderLeftWidth: 1, borderLeftColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: -4, height: 0 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 8, overflow: 'hidden' },
  pointer: { cursor: 'pointer' },
  drawerContent: { flex: 1, overflow: 'hidden' },
});
