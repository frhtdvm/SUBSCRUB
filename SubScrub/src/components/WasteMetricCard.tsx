import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '../constants';
import { formatCurrency } from '../utils/format';
import type { WasteSummary } from '../types';

interface WasteMetricCardProps {
  label: string;
  amount: number;
  currency?: string;
  accent?: boolean;
}

export function WasteMetricCard({ label, amount, currency = 'USD', accent = false }: WasteMetricCardProps) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: accent ? Colors.primaryGlow : Colors.card,
        borderWidth: 1,
        borderColor: accent ? Colors.primary : Colors.border,
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: Colors.textMuted, fontSize: 10, fontFamily: 'SpaceMono', letterSpacing: 1, marginBottom: 6 }}>
        {label}
      </Text>
      <Text style={{ color: accent ? Colors.primary : Colors.text, fontSize: 22, fontFamily: 'SpaceMono', fontWeight: '700' }}>
        {formatCurrency(amount, currency)}
      </Text>
    </View>
  );
}

interface WasteRowProps {
  summary: WasteSummary;
}

export function WasteRow({ summary }: WasteRowProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <WasteMetricCard
        label="MONTHLY WASTE"
        amount={summary.monthlyWaste}
        currency={summary.currency}
        accent
      />
      <WasteMetricCard
        label="YEARLY WASTE"
        amount={summary.yearlyWaste}
        currency={summary.currency}
      />
    </View>
  );
}
