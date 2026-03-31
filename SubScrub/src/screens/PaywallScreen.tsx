import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PaywallScreenProps } from '../navigation/types';
import type { RootStackParamList } from '../navigation/types';
import { Colors, LIFETIME_PRICE } from '../constants';
import { ScreenContainer } from '../components/ScreenContainer';
import { PrimaryButton } from '../components/PrimaryButton';
import { DemoBadge } from '../components/DemoBadge';
import { useAppStore } from '../store/useAppStore';
import {
  purchaseLifetime,
  restorePurchases,
  isRevenueCatConfigured,
} from '../api/revenuecat/RevenueCatService';
import { upsertProfile } from '../db/repositories/UserProfileRepository';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PREMIUM_FEATURES = [
  { icon: '⊞', text: 'Direct cancellation links to 500+ services' },
  { icon: '◈', text: 'GDPR & KVKK legal erasure templates' },
  { icon: '⊙', text: 'Generic cancellation letter generator' },
  { icon: '⚿', text: 'Premium cancellation actions' },
];

export default function PaywallScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<PaywallScreenProps['route']>();
  const store = useAppStore();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const feature = route.params?.feature ?? 'premium features';
  const isConfigured = isRevenueCatConfigured();

  async function handlePurchase() {
    if (!isConfigured) {
      // Demo mode: simulate purchase
      Alert.alert(
        'Demo Mode',
        'RevenueCat is not configured. In production, this would complete a one-time $19.99 purchase.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Simulate Unlock',
            onPress: async () => {
              store.setPremium(true);
              await upsertProfile({ isPremium: true });
              navigation.goBack();
            },
          },
        ]
      );
      return;
    }

    setPurchasing(true);
    try {
      const result = await purchaseLifetime();
      if (result.success && result.entitlementActive) {
        store.setPremium(true);
        await upsertProfile({ isPremium: true });
        Alert.alert('Unlocked!', 'More money stays in your pocket.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else if (result.error) {
        Alert.alert('Purchase Failed', result.error);
      }
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    if (!isConfigured) {
      Alert.alert('Demo Mode', 'RevenueCat is not configured.');
      return;
    }

    setRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.entitlementActive) {
        store.setPremium(true);
        await upsertProfile({ isPremium: true });
        Alert.alert('Restored', 'Premium access restored.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases were found.');
      }
    } finally {
      setRestoring(false);
    }
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 32 }}>
        {/* Close */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ alignSelf: 'flex-end', marginBottom: 8 }}>
          <Text style={{ color: Colors.textMuted, fontSize: 20 }}>✕</Text>
        </TouchableOpacity>

        {!isConfigured && (
          <View style={{ alignSelf: 'center', marginBottom: 16 }}>
            <DemoBadge />
          </View>
        )}

        {/* Headline */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <Text
            style={{
              color: Colors.primary,
              fontSize: 28,
              fontFamily: 'SpaceMono',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: 10,
              lineHeight: 36,
            }}
          >
            Unlock{'\n'}SubScrub Pro
          </Text>
          <Text
            style={{
              color: Colors.textSecondary,
              fontSize: 13,
              fontFamily: 'SpaceMono',
              textAlign: 'center',
              lineHeight: 20,
            }}
          >
            You tried to use {feature}.{'\n'}Unlock everything once. No subscriptions.
          </Text>
        </View>

        {/* Feature list */}
        <View
          style={{
            backgroundColor: Colors.card,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: Colors.border,
            padding: 20,
            marginBottom: 28,
          }}
        >
          {PREMIUM_FEATURES.map((f, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                borderBottomWidth: i < PREMIUM_FEATURES.length - 1 ? 1 : 0,
                borderBottomColor: Colors.border,
              }}
            >
              <Text style={{ color: Colors.primary, fontSize: 16, marginRight: 14, width: 24 }}>{f.icon}</Text>
              <Text style={{ color: Colors.text, fontSize: 12, fontFamily: 'SpaceMono', flex: 1, lineHeight: 18 }}>
                {f.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Price */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Text
            style={{
              color: Colors.primary,
              fontSize: 36,
              fontFamily: 'SpaceMono',
              fontWeight: '700',
            }}
          >
            {LIFETIME_PRICE}
          </Text>
          <Text style={{ color: Colors.textMuted, fontSize: 11, fontFamily: 'SpaceMono', marginTop: 4, letterSpacing: 1 }}>
            ONE-TIME PURCHASE · NO SUBSCRIPTION
          </Text>
        </View>

        {/* CTA */}
        <PrimaryButton
          title={`Unlock for ${LIFETIME_PRICE}`}
          onPress={handlePurchase}
          loading={purchasing}
          size="lg"
        />

        {/* Restore */}
        <TouchableOpacity onPress={handleRestore} disabled={restoring} style={{ marginTop: 16, alignItems: 'center' }}>
          <Text style={{ color: Colors.textMuted, fontSize: 11, fontFamily: 'SpaceMono' }}>
            {restoring ? 'Restoring...' : 'Restore Purchases'}
          </Text>
        </TouchableOpacity>

        {/* Legal note */}
        <Text
          style={{
            color: Colors.textDim,
            fontSize: 9,
            fontFamily: 'SpaceMono',
            textAlign: 'center',
            marginTop: 20,
            lineHeight: 14,
          }}
        >
          One-time non-consumable in-app purchase.{'\n'}
          No subscriptions. No recurring charges. No trials.{'\n'}
          Payment processed by Apple / Google.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}
