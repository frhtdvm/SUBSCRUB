import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors } from '../constants';
import { ScreenContainer } from '../components/ScreenContainer';
import { PrimaryButton } from '../components/PrimaryButton';
import { DemoBadge } from '../components/DemoBadge';
import { useAppStore } from '../store/useAppStore';
import { isGmailConfigured, connectGmail } from '../api/gmail/GmailConnector';
import { isOutlookConfigured, connectOutlook } from '../api/outlook/OutlookConnector';
import { isRevenueCatConfigured } from '../api/revenuecat/RevenueCatService';
import { v4 as uuidv4 } from 'uuid';
import {
  upsertConnection,
  updateConnectionStatus,
} from '../db/repositories/SourceConnectionRepository';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ConnectSources'>;

type Source = 'plaid' | 'gmail' | 'outlook';

export default function ConnectSourcesScreen() {
  const navigation = useNavigation<Nav>();
  const store = useAppStore();
  const [connecting, setConnecting] = useState<Source | null>(null);
  const [connected, setConnected] = useState<Set<Source>>(new Set());

  const isDemoMode = store.isDemoMode;

  async function handleConnect(source: Source) {
    setConnecting(source);
    try {
      if (source === 'gmail' && isGmailConfigured()) {
        const result = await connectGmail();
        if (result.success) {
          await upsertConnection({
            id: uuidv4(),
            source: 'gmail',
            status: 'connected',
            maskedIdentifier: result.data?.maskedEmail ?? null,
            lastSyncAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          setConnected((prev) => new Set(prev).add('gmail'));
          store.updateConnection({ id: uuidv4(), source: 'gmail', status: 'connected', maskedIdentifier: result.data?.maskedEmail ?? null, lastSyncAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        } else if (!result.isDemo) {
          Alert.alert('Connection Failed', result.error ?? 'Could not connect to Gmail');
        }
      } else if (source === 'outlook' && isOutlookConfigured()) {
        const result = await connectOutlook();
        if (result.success) {
          setConnected((prev) => new Set(prev).add('outlook'));
        }
      } else {
        // Demo mode – simulate connection
        await new Promise((r) => setTimeout(r, 1000));
        setConnected((prev) => new Set(prev).add(source));
        await upsertConnection({
          id: uuidv4(),
          source,
          status: 'connected',
          maskedIdentifier: source === 'plaid' ? 'Chase ••4242' : source === 'gmail' ? 'de***@gmail.com' : 'de***@outlook.com',
          lastSyncAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setConnecting(null);
    }
  }

  async function handleStartScan() {
    const sources: Source[] = Array.from(connected).length > 0
      ? Array.from(connected)
      : ['plaid', 'gmail']; // demo default
    navigation.replace('ScanProgress', { sources });
  }

  function SourceCard({ source, label, description, icon }: { source: Source; label: string; description: string; icon: string }) {
    const isConnected = connected.has(source);
    const isLoading = connecting === source;
    const isDemo = isDemoMode && source === 'plaid' ? true : (source === 'gmail' && !isGmailConfigured()) || (source === 'outlook' && !isOutlookConfigured());

    return (
      <View
        style={{
          backgroundColor: Colors.card,
          borderWidth: 1,
          borderColor: isConnected ? Colors.primary : Colors.border,
          borderRadius: 8,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: 22, marginRight: 12, color: Colors.primary }}>{icon}</Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: Colors.text, fontSize: 14, fontFamily: 'SpaceMono', fontWeight: '600' }}>
                  {label}
                </Text>
                {isDemo && <DemoBadge inline />}
              </View>
              <Text style={{ color: Colors.textMuted, fontSize: 11, fontFamily: 'SpaceMono', marginTop: 2 }}>
                {description}
              </Text>
            </View>
          </View>
          {isLoading ? (
            <ActivityIndicator color={Colors.primary} size="small" />
          ) : isConnected ? (
            <Text style={{ color: Colors.primary, fontSize: 18 }}>✓</Text>
          ) : (
            <TouchableOpacity
              onPress={() => handleConnect(source)}
              style={{
                borderWidth: 1,
                borderColor: Colors.primary,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 4,
              }}
            >
              <Text style={{ color: Colors.primary, fontSize: 11, fontFamily: 'SpaceMono' }}>
                {isDemo ? 'DEMO' : 'CONNECT'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 40 }}>
        <Text style={{ color: Colors.primary, fontSize: 24, fontFamily: 'SpaceMono', fontWeight: '700', marginBottom: 8 }}>
          Connect Sources
        </Text>
        <Text style={{ color: Colors.textSecondary, fontSize: 13, fontFamily: 'SpaceMono', marginBottom: 28, lineHeight: 20 }}>
          Connect your bank and inbox to detect subscriptions.{'\n'}Read-only access only.
        </Text>

        {isDemoMode && (
          <View style={{ backgroundColor: Colors.warningDim, borderWidth: 1, borderColor: Colors.warning, borderRadius: 8, padding: 12, marginBottom: 20 }}>
            <Text style={{ color: Colors.warning, fontSize: 11, fontFamily: 'SpaceMono', lineHeight: 18 }}>
              DEMO MODE — No credentials configured.{'\n'}Demo data will be used for scanning.
            </Text>
          </View>
        )}

        <SourceCard
          source="plaid"
          label="Bank Account"
          description="Scan transactions via Plaid (read-only)"
          icon="⊞"
        />
        <SourceCard
          source="gmail"
          label="Gmail"
          description="Scan receipt emails (metadata only)"
          icon="✉"
        />
        <SourceCard
          source="outlook"
          label="Outlook"
          description="Scan receipt emails (metadata only)"
          icon="⊟"
        />

        <View style={{ height: 24 }} />

        <PrimaryButton
          title={connected.size > 0 ? 'Start Scan' : 'Skip & Use Demo Data'}
          onPress={handleStartScan}
          size="lg"
        />

        <Text style={{ color: Colors.textDim, fontSize: 10, fontFamily: 'SpaceMono', textAlign: 'center', marginTop: 16, lineHeight: 16 }}>
          All data is stored locally on your device.{'\n'}Nothing is sent to external servers.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}
