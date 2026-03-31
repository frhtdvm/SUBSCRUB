import React, { useState } from 'react';
import { View, Text, ScrollView, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors } from '../constants';
import { ScreenContainer } from '../components/ScreenContainer';
import { PrimaryButton } from '../components/PrimaryButton';
import { upsertSettings } from '../db/repositories/AppSettingsRepository';
import { useAppStore } from '../store/useAppStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

const SLIDES = [
  {
    icon: '◈',
    title: 'Your money.\nYour device.',
    body: 'SubScrub detects subscriptions and helps you cancel them.\nAll data stays on your device. Always.',
  },
  {
    icon: '⊘',
    title: 'Read-only access.\nNothing stored remotely.',
    body: 'We connect to your bank or inbox in read-only mode.\nWe never see your credentials. Nothing leaves your phone.',
  },
  {
    icon: '⚿',
    title: 'Encrypted local storage.',
    body: 'Your data is encrypted on-device with SQLCipher.\nNo analytics. No crash reporters. No background uploads.',
  },
  {
    icon: '⊙',
    title: 'No subscriptions here.',
    body: 'SubScrub uses a one-time purchase for premium features.\nNo recurring billing. No trials. No upsells.',
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const store = useAppStore();
  const [step, setStep] = useState(0);

  async function handleContinue() {
    if (step < SLIDES.length - 1) {
      setStep(step + 1);
    } else {
      await upsertSettings({ onboardingComplete: true });
      store.setOnboardingComplete(true);
      navigation.replace('ConnectSources');
    }
  }

  const slide = SLIDES[step];

  return (
    <ScreenContainer>
      <View style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
        {/* Progress dots */}
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', paddingTop: 20 }}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === step ? 24 : 8,
                height: 4,
                borderRadius: 2,
                backgroundColor: i === step ? Colors.primary : Colors.border,
              }}
            />
          ))}
        </View>

        {/* Content */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 48, marginBottom: 28, color: Colors.primary }}>{slide.icon}</Text>
          <Text
            style={{
              fontSize: 26,
              fontFamily: 'SpaceMono',
              color: Colors.text,
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: 20,
              lineHeight: 36,
            }}
          >
            {slide.title}
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontFamily: 'SpaceMono',
              color: Colors.textSecondary,
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            {slide.body}
          </Text>
        </View>

        {/* CTA */}
        <PrimaryButton
          title={step === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
          onPress={handleContinue}
          size="lg"
        />
      </View>
    </ScreenContainer>
  );
}
