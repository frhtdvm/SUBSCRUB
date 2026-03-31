import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors } from '../constants';
import { ScreenContainer } from '../components/ScreenContainer';
import { WasteRow } from '../components/WasteMetricCard';
import { SubscriptionCard } from '../components/SubscriptionCard';
import { DemoBadge } from '../components/DemoBadge';
import { useAppStore } from '../store/useAppStore';
import { formatCurrency } from '../utils/format';
import { useScan } from '../hooks/useScan';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const store = useAppStore();
  const { runScan } = useScan();

  const activeSubscriptions = store.subscriptions.filter((s) => s.status !== 'cancelled');
  const potentialThieves = store.subscriptions.filter((s) => s.status === 'potential_leak');
  const topSubs = activeSubscriptions.slice(0, 3);

  async function handleRescan() {
    await runScan(['plaid', 'gmail']);
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={store.isScanning}
            onRefresh={handleRescan}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <View>
            <Text style={{ color: Colors.primary, fontSize: 24, fontFamily: 'SpaceMono', fontWeight: '700' }}>
              SubScrub
            </Text>
            <Text style={{ color: Colors.textMuted, fontSize: 11, fontFamily: 'SpaceMono', marginTop: 2, letterSpacing: 2 }}>
              THE SUBSCRIPTION SNIPER
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {store.isDemoMode && <DemoBadge />}
            {store.isPremium && (
              <View style={{ backgroundColor: Colors.primaryGlow, borderWidth: 1, borderColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 }}>
                <Text style={{ color: Colors.primary, fontSize: 9, fontFamily: 'SpaceMono', letterSpacing: 1 }}>PREMIUM</Text>
              </View>
            )}
          </View>
        </View>

        {/* Waste metrics */}
        {store.wasteSummary ? (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 10, fontFamily: 'SpaceMono', letterSpacing: 2, marginBottom: 10 }}>
              COST OVERVIEW
            </Text>
            <WasteRow summary={store.wasteSummary} />
            <Text style={{ color: Colors.textDim, fontSize: 10, fontFamily: 'SpaceMono', marginTop: 8, textAlign: 'center' }}>
              {store.wasteSummary.subscriptionCount} active subscription{store.wasteSummary.subscriptionCount !== 1 ? 's' : ''} detected
            </Text>
          </View>
        ) : (
          <View style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 20, alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 13, fontFamily: 'SpaceMono', textAlign: 'center', lineHeight: 20 }}>
              No scan data yet.{'\n'}Pull down to run a scan.
            </Text>
          </View>
        )}

        {/* Total saved */}
        {store.profile && store.profile.totalSaved > 0 && (
          <View style={{ backgroundColor: Colors.primaryGlow, borderWidth: 1, borderColor: Colors.primary, borderRadius: 8, padding: 14, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: Colors.primary, fontSize: 12, fontFamily: 'SpaceMono', letterSpacing: 1 }}>
              TOTAL SAVED
            </Text>
            <Text style={{ color: Colors.primary, fontSize: 18, fontFamily: 'SpaceMono', fontWeight: '700' }}>
              {formatCurrency(store.profile.totalSaved)}
            </Text>
          </View>
        )}

        {/* Potential Thieves alert */}
        {potentialThieves.length > 0 && (
          <TouchableOpacity
            onPress={() => navigation.navigate('SubscriptionList' as never)}
            style={{
              backgroundColor: Colors.warningDim,
              borderWidth: 1,
              borderColor: Colors.warning,
              borderRadius: 8,
              padding: 14,
              marginBottom: 24,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: Colors.warning, fontSize: 12, fontFamily: 'SpaceMono' }}>
              ⚠  {potentialThieves.length} Potential Thief{potentialThieves.length !== 1 ? 'es' : ''}
            </Text>
            <Text style={{ color: Colors.warning, fontSize: 11, fontFamily: 'SpaceMono' }}>View →</Text>
          </TouchableOpacity>
        )}

        {/* Top subscriptions */}
        {topSubs.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: Colors.textMuted, fontSize: 10, fontFamily: 'SpaceMono', letterSpacing: 2 }}>
                TOP DRAINS
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SubscriptionList' as never)}>
                <Text style={{ color: Colors.primary, fontSize: 11, fontFamily: 'SpaceMono' }}>
                  View All ({activeSubscriptions.length}) →
                </Text>
              </TouchableOpacity>
            </View>

            {topSubs.map((sub) => (
              <SubscriptionCard
                key={sub.id}
                subscription={sub}
                onPress={() => navigation.navigate('SubscriptionDetail', { subscriptionId: sub.id })}
              />
            ))}
          </View>
        )}

        {/* Rescan button */}
        <TouchableOpacity
          onPress={handleRescan}
          disabled={store.isScanning}
          style={{
            borderWidth: 1,
            borderColor: Colors.primary,
            borderRadius: 6,
            padding: 14,
            alignItems: 'center',
            opacity: store.isScanning ? 0.5 : 1,
          }}
        >
          <Text style={{ color: Colors.primary, fontSize: 12, fontFamily: 'SpaceMono', letterSpacing: 1 }}>
            {store.isScanning ? `SCANNING... ${store.scanProgress}%` : '↻ RUN SCAN'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}
