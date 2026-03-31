import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors } from '../constants';
import { ScreenContainer } from '../components/ScreenContainer';
import { SubscriptionCard } from '../components/SubscriptionCard';
import { useAppStore } from '../store/useAppStore';
import type { Subscription } from '../types';
import { formatCurrency } from '../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Filter = 'all' | 'active' | 'potential_leak' | 'cancelled';

export default function SubscriptionListScreen() {
  const navigation = useNavigation<Nav>();
  const store = useAppStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const filtered = store.subscriptions.filter((s) => {
    if (filter !== 'all' && s.status !== filter) return false;
    if (search && !s.providerName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: store.subscriptions.length,
    active: store.subscriptions.filter((s) => s.status === 'active').length,
    potential_leak: store.subscriptions.filter((s) => s.status === 'potential_leak').length,
    cancelled: store.subscriptions.filter((s) => s.status === 'cancelled').length,
  };

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'active', label: `Verified (${counts.active})` },
    { key: 'potential_leak', label: `Thief (${counts.potential_leak})` },
    { key: 'cancelled', label: `Cancelled (${counts.cancelled})` },
  ];

  return (
    <ScreenContainer>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ padding: 20, paddingBottom: 12 }}>
          <Text style={{ color: Colors.primary, fontSize: 22, fontFamily: 'SpaceMono', fontWeight: '700', marginBottom: 16 }}>
            Subscriptions
          </Text>

          {/* Search */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: Colors.card,
              borderWidth: 1,
              borderColor: Colors.border,
              borderRadius: 6,
              paddingHorizontal: 12,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: Colors.textDim, fontSize: 14, marginRight: 8 }}>⌕</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search subscriptions..."
              placeholderTextColor={Colors.textDim}
              style={{
                flex: 1,
                color: Colors.text,
                fontSize: 13,
                fontFamily: 'SpaceMono',
                paddingVertical: 10,
              }}
            />
          </View>

          {/* Filter tabs */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: filter === f.key ? Colors.primary : Colors.border,
                  backgroundColor: filter === f.key ? Colors.primaryGlow : 'transparent',
                }}
              >
                <Text
                  style={{
                    color: filter === f.key ? Colors.primary : Colors.textMuted,
                    fontSize: 10,
                    fontFamily: 'SpaceMono',
                  }}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* List */}
        {filtered.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 13, fontFamily: 'SpaceMono', textAlign: 'center', lineHeight: 22 }}>
              No subscriptions found.{'\n'}Run a scan to detect them.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
            renderItem={({ item }) => (
              <SubscriptionCard
                subscription={item}
                onPress={() =>
                  navigation.navigate('SubscriptionDetail', { subscriptionId: item.id })
                }
              />
            )}
          />
        )}
      </View>
    </ScreenContainer>
  );
}
