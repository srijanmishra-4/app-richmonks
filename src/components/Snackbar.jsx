import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Platform, Pressable } from 'react-native';

const DURATION = 3500;

export function useSnackbar() {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);

  const show = useCallback((msg) => {
    setMessage(msg);
    setVisible(true);
  }, []);

  const hide = useCallback(() => setVisible(false), []);

  return { message, visible, show, hide };
}

function AlertCircleIcon({ size = 18, color = '#EF4444' }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.6,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 1.8,
            height: size * 0.38,
            backgroundColor: color,
            borderRadius: 1,
            marginBottom: 2,
          }}
        />
        <View
          style={{
            width: 2,
            height: 2,
            backgroundColor: color,
            borderRadius: 1,
          }}
        />
      </View>
    </View>
  );
}

export default function Snackbar({ message, visible, onDismiss }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, friction: 8, tension: 70, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 24, duration: 200, useNativeDriver: true }),
        ]).start(() => onDismiss?.());
      }, DURATION);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [visible, message, opacity, translateY, onDismiss]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: Platform.OS === 'web' ? 28 : 44,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: 20,
        opacity,
        transform: [{ translateY }],
        zIndex: 9999,
        pointerEvents: 'box-none',
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          borderWidth: 1,
          borderColor: '#FEE2E2',
          borderLeftWidth: 4,
          borderLeftColor: '#EF4444',
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          ...(Platform.OS === 'web'
            ? { boxShadow: '0 10px 25px -4px rgba(15, 23, 42, 0.1), 0 4px 10px -2px rgba(15, 23, 42, 0.05)' }
            : {
                shadowColor: '#0F172A',
                shadowOpacity: 0.1,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 6 },
                elevation: 8,
              }),
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#FEE2E2',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
            flexShrink: 0,
          }}
        >
          <AlertCircleIcon size={18} color="#EF4444" />
        </View>
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            fontFamily: 'Inter_500Medium',
            color: '#1E293B',
            lineHeight: 20,
          }}
        >
          {message}
        </Text>
        <Pressable
          onPress={onDismiss}
          hitSlop={10}
          style={({ pressed, hovered }) => ({
            padding: 6,
            marginLeft: 8,
            borderRadius: 8,
            backgroundColor: pressed ? '#F1F5F9' : hovered ? '#F8FAFC' : 'transparent',
            ...(Platform.OS === 'web' ? { cursor: 'pointer' } : null),
          })}
          accessibilityLabel="Dismiss notification"
        >
          <Text style={{ fontSize: 15, color: '#94A3B8', fontWeight: '600', lineHeight: 15 }}>✕</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
