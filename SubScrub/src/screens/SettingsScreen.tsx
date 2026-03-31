import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors } from '../constants';
import { ScreenContainer } from '../components/ScreenContainer';
import { PrimaryButton } from '../components/PrimaryButton';
import { DemoBadge } from '../components/DemoBadge';
import { useAppStore } from '../store/useAppStore';
import { deleteAllLocalData } from '../db/database';
import { disconnectPlaid } from '../api/plaid/PlaidConnector';
import { disconnectGmail } from '../api/gmail/GmailConnector';
import { disconnectOutlook } from '../api/outlook/OutlookConnector';
import { formatDate } from '../utils/format';
import type { Jurisdiction } from '../types';
import { upsertSettings } from '../db/repositories/AppSettingsRepository';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const store = useAppStore();
  const [deleting, setDeleting] = useState(false);

  const jurisdictions: Jurisdiction[] = ['GENERIC', 'GDPR', 'KVKK'];
  const currentJurisdiction: Jurisdiction = (store.settings?.jurisdiction ?? 'GENERIC') as Jurisdiction;

  async function handleSetJurisdiction(j: Jurisdiction) {
    await upsertSettings({ jurisdiction: j });
    store.setSettings({ ...store.settings!, jurisdiction: j });
  }

  async function handleDeleteAll() {
    Alert.alert(
      'Delete All Local Data',
      'This will permanently delete all your scans, subscriptions, and settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAllLocalData();
              await disconnectPlaid();
              await disconnectGmail();
              await disconnectOutlook();
              store.reset();
              navigation.replace('Onboarding');
            } catch (e) {
              Alert.alert('Error', String(e));
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: Colors.textMuted, fontSize: 10, fontFamily: 'SpaceMono', letterSpacing: 2, marginBottom: 10 }}>
          {title}
        </Text>
        <View style={{ backgroundColor: Colors.card, borderRadius: 8, borderWidth: 1, borderColor: Colors.border }}>
          {children}
        </View>
      </View>
    );
  }

  function SettingsRow({ label, value, onPress, danger }: { label: string; value?: string; onPress?: () => void; danger?: boolean }) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={onPress ? 0.7 : 1}
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 14,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <Text style={{ color: danger ? Colors.warning : Colors.text, fontSize: 13, fontFamily: 'SpaceMono' }}>
          {label}
        </Text>
        {value ? (
          <Text style={{ color: Colors.textMuted, fontSize: 11, fontFamily: 'SpaceMono' }}>{value}</Text>
        ) : onPress ? (
          <Text style={{ color: Colors.textDim, fontSize: 14 }}>›</Text>
        ) : null}
      </TouchableOpacity>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 28 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <Text style={{ color: Colors.primary, fontSize: 22, fontFamily: 'SpaceMono', fontWeight: '700' }}>
            Settings
          </Text>
          {store.isDemoMode && <DemoBadge />}
        </View>

        {/* Account status */}
        <SettingsSection title="ACCOUNT">
          <SettingsRow
            label="Status"
            value={store.isPremium ? '◈ Premium' : 'Free'}
          />
          {!store.isPremium && (
            <SettingsRow
              label="Unlock Premium"
              onPress={() => navigation.navigate('Paywall', {})}
            />
          )}
          <SettingsRow
            label="Last Scan"
            value={store.profile?.lastScanDate ? formatDate(store.profile.lastScanDate) : 'Never'}
          />
          <SettingsRow
            label="Total Saved"
            value={store.profile ? `$${store.profile.totalSaved.toFixed(2)}` : '$0.00'}
          />
        </SettingsSection>

        {/* Sources */}
        <SettingsSection title="CONNECTED SOURCES">
          {store.connections.length === 0 ? (
            <View style={{ padding: 14 }}>
              <Text style={{ color: Colors.textMuted, fontSize: 12, fontFamily: 'SpaceMono' }}>
                No sources connected.
              </Text>
            </View>
          ) : (
            store.connections.map((conn) => (
              <SettingsRow
                key={conn.id}
                label={conn.source.charAt(0).toUpperCase() + conn.source.slice(1)}
                value={conn.maskedIdentifier ?? conn.status}
              />
            ))
          )}
          <SettingsRow
            label="Manage Sources"
            onPress={() => navigation.navigate('ConnectSources')}
          />
        </SettingsSection>

        {/* Jurisdiction */}
        <SettingsSection title="LEGAL JURISDICTION">
          {jurisdictions.map((j) => (
            <TouchableOpacity
              key={j}
              onPress={() => handleSetJurisdiction(j)}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 14,
                borderBottomWidth: 1,
                borderBottomColor: Colors.border,
              }}
            >
              <View>
                <Text style={{ color: Colors.text, fontSize: 13, fontFamily: 'SpaceMono' }}>{j}</Text>
                <Text style={{ color: Colors.textDim, fontSize: 10, fontFamily: 'SpaceMono' }}>
                  {j === 'GDPR' ? 'EU data protection' : j === 'KVKK' ? 'Turkey data protection' : 'Standard letter'}
                </Text>
              </View>
              {currentJurisdiction === j && (
                <Text style={{ color: Colors.primary, fontSize: 16 }}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </SettingsSection>

        {/* Privacy */}
        <SettingsSection title="PRIVACY">
          <SettingsRow label="Analytics" value="NONE" />
          <SettingsRow label="Remote Logging" value="NONE" />
          <SettingsRow label="Data Storage" value="Local Only" />
          <SettingsRow label="Encryption" value="SQLCipher" />
          <SettingsRow
            label="Delete All Local Data"
            onPress={handleDeleteAll}
            danger
          />
        </SettingsSection>

        {/* App info */}
        <SettingsSection title="ABOUT">
          <SettingsRow label="App" value="SubScrub" />
          <SettingsRow label="Version" value="1.0.0" />
          <SettingsRow label="Build" value="Production" />
          <SettingsRow
            label={store.isDemoMode ? 'Mode: DEMO' : 'Mode: Production'}
            value={store.isDemoMode ? 'No credentials' : 'Connected'}
          />
        </SettingsSection>

        <Text style={{ color: Colors.textDim, fontSize: 10, fontFamily: 'SpaceMono', textAlign: 'center', lineHeight: 16, marginBottom: 40 }}>
          SubScrub — Privacy-first subscription sniper{'\n'}
          No analytics · No tracking · Local-only
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}
