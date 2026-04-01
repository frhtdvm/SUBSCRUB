import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ScanProgressScreenProps } from '../navigation/types';
import type { RootStackParamList } from '../navigation/types';
import { Colors } from '../constants';
import { ScreenContainer } from '../components/ScreenContainer';
import { useScan } from '../hooks/useScan';
import { useAppStore } from '../store/useAppStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ScanProgress'>;

export default function ScanProgressScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<ScanProgressScreenProps['route']>();
  const { runScan } = useScan();
  const store = useAppStore();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const hasStarted = useRef(false);
  // Local flag — captures the moment scanProgress hits 100, before useScan resets it
  const [scanDone, setScanDone] = useState(false);

  // Start spinner rotation loop
  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, [spinAnim]);

  // Kick off scan exactly once
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    const sources = (route.params?.sources ?? ['plaid', 'gmail']) as ('plaid' | 'gmail' | 'outlook')[];
    runScan(sources);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Animate progress bar to match store value
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: store.scanProgress / 100,
      duration: 400,
      useNativeDriver: false,
    }).start();
    // Capture done state here — useScan resets progress to 0 shortly after, so we
    // must latch it while it's still 100.
    if (store.scanProgress >= 100) {
      setScanDone(true);
    }
  }, [store.scanProgress, progressAnim]);

  // Navigate when the scan completes
  useEffect(() => {
    if (!scanDone) return;
    const timer = setTimeout(() => navigation.replace('Main'), 800);
    return () => clearTimeout(timer);
  }, [scanDone, navigation]);

  const spinDeg = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const displayProgress = scanDone ? 100 : store.scanProgress;

  return (
    <ScreenContainer>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        {/* Rotating spinner */}
        <Animated.View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            borderWidth: 3,
            borderColor: Colors.primary,
            borderTopColor: Colors.background,
            marginBottom: 32,
            shadowColor: Colors.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 20,
            transform: [{ rotate: spinDeg }],
          }}
        />

        <Text
          style={{
            color: scanDone ? Colors.primary : Colors.text,
            fontSize: 22,
            fontFamily: 'SpaceMono',
            fontWeight: '700',
            marginBottom: 8,
          }}
        >
          {scanDone ? 'Scan Complete' : 'Scanning...'}
        </Text>

        <Text
          style={{
            color: Colors.textMuted,
            fontSize: 12,
            fontFamily: 'SpaceMono',
            marginBottom: 32,
            textAlign: 'center',
          }}
        >
          {scanDone ? 'Loading dashboard...' : (store.scanStage || 'Initializing...')}
        </Text>

        {/* Progress bar */}
        <View
          style={{
            width: '100%',
            height: 6,
            backgroundColor: Colors.card,
            borderRadius: 3,
            overflow: 'hidden',
            marginBottom: 12,
          }}
        >
          <Animated.View
            style={{
              height: '100%',
              borderRadius: 3,
              backgroundColor: Colors.primary,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
              shadowColor: Colors.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 6,
            }}
          />
        </View>

        <Text
          style={{
            color: Colors.textDim,
            fontSize: 11,
            fontFamily: 'SpaceMono',
          }}
        >
          {displayProgress}%
        </Text>

        <View style={{ position: 'absolute', bottom: 40 }}>
          <Text
            style={{
              color: Colors.textDim,
              fontSize: 10,
              fontFamily: 'SpaceMono',
              textAlign: 'center',
              lineHeight: 16,
            }}
          >
            Running detection on-device.{'\n'}No data leaves your phone.
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}
