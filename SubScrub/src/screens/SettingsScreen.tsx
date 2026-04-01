import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
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

// Which production env vars are needed per mode
const CREDENTIAL_REQUIREMENTS = [
  { key: 'EXPO_PUBLIC_PLAID_BROKER_BASE_URL', label: 'Plaid Broker URL', service: 'Bank transactions' },
  { key: 'EXPO_PUBLIC_GOOGLE_CLIENT_ID', label: 'Google Client ID', service: 'Gmail receipts' },
  { key: 'EXPO_PUBLIC_MS_CLIENT_ID', label: 'Microsoft Client ID', service: 'Outlook receipts' },
  { key: 'EXPO_PUBLIC_REVENUECAT_API_KEY', label: 'RevenueCat API Key', service: 'In-app purchases' },
];

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

  function handleToggleDemoMode() {
    const isCurrentlyDemo = store.isDemoMode;
    if (!isCurrentlyDemo) {
      // Already in production mode; switching to demo is safe
      store.setDemoMode(true);
      upsertSettings({ isDemoMode: true });
      return;
    }
    // Switching OFF demo mode — warn that real credentials are needed
    Alert.alert(
      'Switch to Production Mode',
      'Production mode uses your real bank and email credentials.\n\nYou must have configured the following environment variables in your EAS build:\n\n' +
        CREDENTIAL_REQUIREMENTS.map((c) => `• ${c.label}`).join('\n') +
        '\n\nWithout these, sources will silently fall back to demo data.',
      [
        { text: 'Keep Demo Mode', style: 'cancel' },
        {
          text: 'Switch to Production',
          onPress: () => {
            store.setDemoMode(false);
            upsertSettings({ isDemoMode: false });
          },
        },
      ]
    );
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

  function SettingsRow({ label, value, onPress, danger, last }: { label: string; value?: string; onPress?: () => void; danger?: boolean; last?: boolean }) {
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
          borderBottomWidth: last ? 0 : 1,
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

        {/* Demo / Production mode toggle */}
        <SettingsSection title="DATA SOURCE MODE">
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 14,
              borderBottomWidth: 1,
              borderBottomColor: Colors.border,
            }}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: Colors.text, fontSize: 13, fontFamily: 'SpaceMono', fontWeight: '600' }}>
                {store.isDemoMode ? 'Demo Mode' : 'Production Mode'}
              </Text>
              <Text style={{ color: Colors.textDim, fontSize: 10, fontFamily: 'SpaceMono', marginTop: 3, lineHeight: 15 }}>
                {store.isDemoMode
                  ? 'Using seeded demo data. No real credentials.'
                  : 'Using real bank & email connections.'}
              </Text>
            </View>
            <Switch
              value={!store.isDemoMode}
              onValueChange={handleToggleDemoMode}
              trackColor={{ false: Colors.border, true: Colors.primaryDim }}
              thumbColor={store.isDemoMode ? Colors.textDim : Colors.primary}
            />
          </View>

          {store.isDemoMode ? (
            <View style={{ padding: 14 }}>
              <Text style={{ color: Colors.textDim, fontSize: 10, fontFamily: 'SpaceMono', lineHeight: 16 }}>
                Production mode requires the following env vars in your EAS build:
              </Text>
              {CREDENTIAL_REQUIREMENTS.map((c) => {
                const configured = !!process.env[c.key];
                return (
                  <View key={c.key} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                    <Text style={{ color: configured ? Colors.primary : Colors.warning, fontSize: 11, marginRight: 6 }}>
                      {configured ? '✓' : '○'}
                    </Text>
                    <View>
                      <Text style={{ color: configured ? Colors.text : Colors.textMuted, fontSize: 11, fontFamily: 'SpaceMono' }}>
                        {c.label}
                      </Text>
                      <Text style={{ color: Colors.textDim, fontSize: 9, fontFamily: 'SpaceMono' }}>{c.service}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={{ padding: 14 }}>
              <Text style={{ color: Colors.primary, fontSize: 10, fontFamily: 'SpaceMono', lineHeight: 16 }}>
                Connected to real sources. Scans use live bank data and email receipts.
              </Text>
            </View>
          )}
        </SettingsSection>

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
            last
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
            last
          />
        </SettingsSection>

        {/* Jurisdiction */}
        <SettingsSection title="LEGAL JURISDICTION">
          {jurisdictions.map((j, i) => (
            <TouchableOpacity
              key={j}
              onPress={() => handleSetJurisdiction(j)}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 14,
                borderBottomWidth: i < jurisdictions.length - 1 ? 1 : 0,
                borderBottomColor: Colors.border,
              }}
            >
              <View>
                <Text style={{ color: currentJurisdiction === j ? Colors.primary : Colors.text, fontSize: 13, fontFamily: 'SpaceMono', fontWeight: currentJurisdiction === j ? '700' : '400' }}>
                  {j}
                </Text>
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
            last
          />
        </SettingsSection>

        {/* App info */}
        <SettingsSection title="ABOUT">
          <SettingsRow label="App" value="SubScrub" />
          <SettingsRow label="Version" value="1.0.0" />
          <SettingsRow
            label="Build"
            value={store.isDemoMode ? 'Demo' : 'Production'}
            last
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
