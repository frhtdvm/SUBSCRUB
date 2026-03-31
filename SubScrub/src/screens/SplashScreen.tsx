import React, { useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors } from '../constants';
import { useAppInit } from '../hooks/useAppInit';
import { useAppStore } from '../store/useAppStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

export default function SplashScreen() {
  const navigation = useNavigation<Nav>();
  const { initialize } = useAppInit();
  const store = useAppStore();
  const opacity = React.useRef(new Animated.Value(0)).current;
  const glow = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(async () => {
      if (store.onboardingComplete) {
        navigation.replace('Main');
      } else {
        navigation.replace('Onboarding');
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, [navigation, store.onboardingComplete, opacity, glow]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ opacity, alignItems: 'center' }}>
        <Animated.View
          style={{
            opacity: glow,
            shadowColor: Colors.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 30,
            elevation: 20,
          }}
        >
          <Text
            style={{
              fontSize: 52,
              fontFamily: 'SpaceMono',
              color: Colors.primary,
              fontWeight: '700',
              letterSpacing: 2,
            }}
          >
            SubScrub
          </Text>
        </Animated.View>
        <Text
          style={{
            color: Colors.textMuted,
            fontSize: 13,
            fontFamily: 'SpaceMono',
            marginTop: 10,
            letterSpacing: 3,
          }}
        >
          THE SUBSCRIPTION SNIPER
        </Text>
      </Animated.View>

      <View style={{ position: 'absolute', bottom: 40 }}>
        <Text style={{ color: Colors.textDim, fontSize: 10, fontFamily: 'SpaceMono', letterSpacing: 2 }}>
          PRIVACY-FIRST · LOCAL-ONLY
        </Text>
      </View>
    </View>
  );
}
