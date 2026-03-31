import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Colors } from '../constants';
import type { Subscription } from '../types';
import { formatCurrency, formatDateRelative } from '../utils/format';

interface SubscriptionCardProps {
  subscription: Subscription;
  onPress?: () => void;
}

function StatusBadge({ status }: { status: Subscription['status'] }) {
  const configs = {
    active: { label: 'Verified', color: Colors.primary, bg: Colors.primaryGlow },
    potential_leak: { label: 'Potential Thief', color: Colors.warning, bg: Colors.warningGlow },
    cancelled: { label: 'Cancelled', color: Colors.cancelled, bg: Colors.border },
  };
  const cfg = configs[status];
  return (
    <View style={{ backgroundColor: cfg.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: cfg.color }}>
      <Text style={{ color: cfg.color, fontSize: 9, fontFamily: 'SpaceMono', letterSpacing: 1 }}>
        {cfg.label}
      </Text>
    </View>
  );
}

export function SubscriptionCard({ subscription, onPress }: SubscriptionCardProps) {
  const isCancelled = subscription.status === 'cancelled';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        padding: 16,
        marginBottom: 10,
        opacity: isCancelled ? 0.6 : 1,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ color: Colors.text, fontSize: 15, fontFamily: 'SpaceMono', fontWeight: '600' }} numberOfLines={1}>
            {subscription.providerName}
          </Text>
          <Text style={{ color: Colors.textMuted, fontSize: 11, fontFamily: 'SpaceMono', marginTop: 2 }}>
            {subscription.frequency === 'monthly' ? 'per month' : 'per year'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: isCancelled ? Colors.cancelled : Colors.primary, fontSize: 16, fontFamily: 'SpaceMono', fontWeight: '700' }}>
            {formatCurrency(subscription.amount, subscription.currency)}
          </Text>
          <StatusBadge status={subscription.status} />
        </View>
      </View>

      {!isCancelled && subscription.nextBillingDate && (
        <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center' }}>
          <Text style={{ color: Colors.textDim, fontSize: 10, fontFamily: 'SpaceMono' }}>
            Next charge: {' '}
          </Text>
          <Text style={{ color: Colors.textMuted, fontSize: 10, fontFamily: 'SpaceMono' }}>
            {formatDateRelative(subscription.nextBillingDate)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
