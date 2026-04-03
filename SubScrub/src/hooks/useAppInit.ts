import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { openDatabase } from '../db/database';
import { initSchema } from '../db/schema';
import {
  upsertProfile,
  getProfile,
  getSettings,
  upsertSettings,
  getAllConnections,
  getActiveSubscriptions,
  seedDirectory,
  getDirectoryCount,
} from '../db/repositories';
import { calculateWaste } from '../engine/calculateWaste';
import { checkEntitlement, initRevenueCat, isRevenueCatConfigured } from '../api/revenuecat/RevenueCatService';
import cancellationDirectory from '../data/cancellation-directory.json';
import demoTransactions from '../data/demo-transactions.json';
import demoEmails from '../data/demo-emails.json';
import { detectRecurring } from '../engine/detectRecurring';
import type {
  CancellationDirectoryEntry,
  TransactionRecord,
  EmailArtifact,
  RecurringGroup,
  Subscription,
  DetectionSource,
} from '../types';

/** Map a detected RecurringGroup → persisted Subscription shape for web demo */
function groupToSubscription(g: RecurringGroup, idx: number): Subscription {
  const dir = g.directoryMatch;
  return {
    id: `demo-${idx}`,
    providerName: dir?.providerName ?? g.rawName,
    normalizedProvider: g.normalizedProvider,
    amount: g.medianAmount,
    currency: g.currency,
    frequency: g.frequency ?? 'monthly',
    nextBillingDate: null,
    category: dir?.category ?? 'other',
    cancellationLink: dir?.cancellationLink ?? null,
    supportEmail: dir?.supportEmail ?? null,
    status: g.confidenceScore >= 0.6 ? 'active' : 'potential_leak',
    confidenceScore: g.confidenceScore,
    detectionSource: 'combined' as DetectionSource,
    lastChargeDate: g.lastChargeDate,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function useAppInit() {
  const store = useAppStore();

  const initialize = useCallback(async () => {
    try {
      // ── Web: skip SQLite entirely, load demo data directly ───────────
      if (Platform.OS === 'web') {
        store.setDemoMode(true);
        store.setOnboardingComplete(false);
        const groups = detectRecurring(
          demoTransactions as TransactionRecord[],
          demoEmails as EmailArtifact[],
          cancellationDirectory as CancellationDirectoryEntry[]
        );
        const subs = groups.map(groupToSubscription);
        store.setSubscriptions(subs);
        if (subs.length > 0) store.setWasteSummary(calculateWaste(subs));
        return;
      }

      // ── Native: full SQLite-backed initialization ────────────────────
      await openDatabase();
      await initSchema();

      let settings = await getSettings();
      if (!settings) {
        settings = await upsertSettings({
          isDemoMode: true,
          onboardingComplete: false,
          hasSeededDirectory: false,
        });
      }
      store.setSettings(settings);
      store.setOnboardingComplete(settings.onboardingComplete);

      const dirCount = await getDirectoryCount();
      if (dirCount === 0 || !settings.hasSeededDirectory) {
        await seedDirectory(cancellationDirectory as CancellationDirectoryEntry[]);
        await upsertSettings({ hasSeededDirectory: true });
      }

      let profile = await getProfile();
      if (!profile) profile = await upsertProfile({});
      store.setProfile(profile);

      const connections = await getAllConnections();
      store.setConnections(connections);

      const subs = await getActiveSubscriptions();
      store.setSubscriptions(subs);
      if (subs.length > 0) store.setWasteSummary(calculateWaste(subs));

      await initRevenueCat();
      if (isRevenueCatConfigured()) {
        const isPremium = await checkEntitlement();
        store.setPremium(isPremium);
        if (isPremium) await upsertProfile({ isPremium: true });
      }

      store.setDemoMode(!isRevenueCatConfigured());
    } catch {
      store.setDemoMode(true);
    }
  }, [store]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return { initialize };
}
