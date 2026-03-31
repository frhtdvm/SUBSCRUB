import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ScanProgressScreenProps } from '../navigation/types';
import type { RootStackParamList } from '../navigation/types';
import { Colors } from '../constants';
import { ScreenContainer } from '../components/ScreenContainer';
import { useScan } from '../hooks/useScan';
import { useAppStore } from '../store/useAppStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ScanProgress'>;

const STAGES = [
  'Initializing...',
  'Connecting to sources...',
  'Fetching bank transactions...',
  'Scanning Gmail receipts...',
  'Analyzing patterns...',
  'Detecting subscriptions...',
  'Building subscription list...',
  'Calculating costs...',
  'Done!',
];

export default function ScanProgressScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<ScanProgressScreenProps['route']>();
  const { runScan } = useScan();
  const store = useAppStore();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const sources = (route.params?.sources ?? ['plaid', 'gmail']) as ('plaid' | 'gmail' | 'outlook')[];
    runScan(sources);
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: store.scanProgress / 100,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [store.scanProgress]);

  useEffect(() => {
    if (!store.isScanning && store.scanProgress === 100) {
      setTimeout(() => {
        navigation.replace('Main');
      }, 600);
    }
  }, [store.isScanning, store.scanProgress]);

  return (
    <ScreenContainer>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        {/* Animated spinner */}
        <View
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
          }}
        />

        <Text
          style={{
            color: Colors.primary,
            fontSize: 22,
            fontFamily: 'SpaceMono',
            fontWeight: '700',
            marginBottom: 8,
          }}
        >
          Scanning...
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
          {store.scanStage || 'Initializing...'}
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
          {store.scanProgress}%
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
