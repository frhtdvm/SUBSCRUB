import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SubscriptionDetailScreenProps } from '../navigation/types';
import type { RootStackParamList } from '../navigation/types';
import { Colors } from '../constants';
import { ScreenContainer } from '../components/ScreenContainer';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAppStore } from '../store/useAppStore';
import {
  updateSubscriptionStatus,
  getSubscriptionById,
} from '../db/repositories/SubscriptionRepository';
import { upsertProfile } from '../db/repositories/UserProfileRepository';
import { savedAmount } from '../engine/calculateWaste';
import { formatCurrency, formatDate, formatDateRelative, formatConfidence, categoryLabel } from '../utils/format';
import type { Jurisdiction } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SubscriptionDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<SubscriptionDetailScreenProps['route']>();
  const store = useAppStore();
  const [cancelling, setCancelling] = useState(false);

  const subscription = store.subscriptions.find(
    (s) => s.id === route.params.subscriptionId
  );

  if (!subscription) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: Colors.textMuted, fontFamily: 'SpaceMono' }}>Not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
            <Text style={{ color: Colors.primary, fontFamily: 'SpaceMono' }}>← Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // Re-bind after the guard so TypeScript narrows correctly inside closures
  const sub = subscription;
  const isCancelled = sub.status === 'cancelled';

  async function handleMarkCancelled() {
    if (isCancelled) return;
    setCancelling(true);
    try {
      await updateSubscriptionStatus(sub.id, 'cancelled');
      store.updateSubscription(sub.id, { status: 'cancelled' });

      const saved = savedAmount(sub);
      const profile = store.profile;
      if (profile) {
        const newTotal = profile.totalSaved + saved;
        await upsertProfile({ totalSaved: newTotal });
        store.setProfile({ ...profile, totalSaved: newTotal });
      }

      Alert.alert(
        'More money stays in your pocket.',
        `${sub.providerName} marked as cancelled.\nYou save ${formatCurrency(saved, sub.currency)}/month.`
      );
    } finally {
      setCancelling(false);
    }
  }

  function handleOpenCancellationLink() {
    if (!store.isPremium) {
      navigation.navigate('Paywall', { feature: 'cancellation links' });
      return;
    }
    if (sub.cancellationLink) {
      Linking.openURL(sub.cancellationLink).catch(() =>
        Alert.alert('Error', 'Could not open link')
      );
    }
  }

  function handleOpenLegalTemplate(jurisdiction: Jurisdiction) {
    if (!store.isPremium) {
      navigation.navigate('Paywall', { feature: 'legal templates' });
      return;
    }
    navigation.navigate('LegalTemplatePreview', { subscription: sub, jurisdiction });
  }

  function StatusLabel() {
    const cfg = {
      active: { label: 'Verified', color: Colors.primary },
      potential_leak: { label: 'Potential Thief', color: Colors.warning },
      cancelled: { label: 'Cancelled', color: Colors.cancelled },
    };
    const c = cfg[sub.status];
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.color }} />
        <Text style={{ color: c.color, fontSize: 12, fontFamily: 'SpaceMono', fontWeight: '600' }}>
          {c.label}
        </Text>
      </View>
    );
  }

  function InfoRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <Text style={{ color: Colors.textDim, fontSize: 11, fontFamily: 'SpaceMono' }}>{label}</Text>
        <Text style={{ color: accent ? Colors.primary : Colors.text, fontSize: 12, fontFamily: 'SpaceMono', fontWeight: accent ? '700' : '400' }}>{value}</Text>
      </View>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 24 }}>
        {/* Back */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 20 }}>
          <Text style={{ color: Colors.primary, fontSize: 13, fontFamily: 'SpaceMono' }}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              color: isCancelled ? Colors.cancelled : Colors.text,
              fontSize: 24,
              fontFamily: 'SpaceMono',
              fontWeight: '700',
              marginBottom: 6,
            }}
          >
            {sub.providerName}
          </Text>
          <StatusLabel />
        </View>

        {/* Cost highlight */}
        <View
          style={{
            backgroundColor: isCancelled ? Colors.card : Colors.primaryGlow,
            borderWidth: 1,
            borderColor: isCancelled ? Colors.border : Colors.primary,
            borderRadius: 10,
            padding: 20,
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <Text style={{ color: Colors.textMuted, fontSize: 11, fontFamily: 'SpaceMono', letterSpacing: 2, marginBottom: 6 }}>
            {sub.frequency === 'monthly' ? 'MONTHLY CHARGE' : 'YEARLY CHARGE'}
          </Text>
          <Text
            style={{
              color: isCancelled ? Colors.cancelled : Colors.primary,
              fontSize: 36,
              fontFamily: 'SpaceMono',
              fontWeight: '700',
            }}
          >
            {formatCurrency(sub.amount, sub.currency)}
          </Text>
          {sub.nextBillingDate && !isCancelled && (
            <Text style={{ color: Colors.textMuted, fontSize: 11, fontFamily: 'SpaceMono', marginTop: 4 }}>
              Next: {formatDateRelative(sub.nextBillingDate)}
            </Text>
          )}
        </View>

        {/* Details */}
        <View style={{ backgroundColor: Colors.card, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, marginBottom: 24 }}>
          <InfoRow label="Category" value={categoryLabel(sub.category)} />
          <InfoRow label="Detection Source" value={sub.detectionSource.toUpperCase()} />
          <InfoRow label="Confidence" value={formatConfidence(sub.confidenceScore)} accent />
          <InfoRow label="Last Charge" value={formatDate(sub.lastChargeDate)} />
          <InfoRow label="First Detected" value={formatDate(sub.createdAt)} />
        </View>

        {/* Actions */}
        {!isCancelled && (
          <View style={{ gap: 12, marginBottom: 24 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 10, fontFamily: 'SpaceMono', letterSpacing: 2, marginBottom: 4 }}>
              CANCELLATION OPTIONS
            </Text>

            {/* Direct cancellation link */}
            {sub.cancellationLink ? (
              <TouchableOpacity
                onPress={handleOpenCancellationLink}
                style={{
                  backgroundColor: Colors.card,
                  borderWidth: 1,
                  borderColor: store.isPremium ? Colors.primary : Colors.border,
                  borderRadius: 8,
                  padding: 14,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: store.isPremium ? Colors.primary : Colors.textMuted, fontSize: 13, fontFamily: 'SpaceMono' }}>
                  Open Cancellation Page
                </Text>
                {!store.isPremium && (
                  <View style={{ backgroundColor: Colors.warningDim, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, borderWidth: 1, borderColor: Colors.warning }}>
                    <Text style={{ color: Colors.warning, fontSize: 9, fontFamily: 'SpaceMono' }}>PREMIUM</Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : null}

            {/* Legal templates */}
            {(['GENERIC', 'GDPR', 'KVKK'] as Jurisdiction[]).map((j) => (
              <TouchableOpacity
                key={j}
                onPress={() => handleOpenLegalTemplate(j)}
                style={{
                  backgroundColor: Colors.card,
                  borderWidth: 1,
                  borderColor: store.isPremium ? Colors.border : Colors.border,
                  borderRadius: 8,
                  padding: 14,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: store.isPremium ? Colors.text : Colors.textMuted, fontSize: 13, fontFamily: 'SpaceMono' }}>
                  {j === 'GENERIC' ? 'Generic Cancellation Letter' : `${j} Erasure Request`}
                </Text>
                {!store.isPremium && (
                  <View style={{ backgroundColor: Colors.warningDim, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, borderWidth: 1, borderColor: Colors.warning }}>
                    <Text style={{ color: Colors.warning, fontSize: 9, fontFamily: 'SpaceMono' }}>PREMIUM</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Mark cancelled */}
        {!isCancelled ? (
          <PrimaryButton
            title="Mark as Cancelled"
            onPress={handleMarkCancelled}
            loading={cancelling}
            variant="ghost"
            size="lg"
          />
        ) : (
          <View style={{ alignItems: 'center', padding: 16 }}>
            <Text style={{ color: Colors.primary, fontSize: 14, fontFamily: 'SpaceMono' }}>
              ✓ Subscription cancelled
            </Text>
            <Text style={{ color: Colors.textMuted, fontSize: 11, fontFamily: 'SpaceMono', marginTop: 4 }}>
              More money stays in your pocket.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}
