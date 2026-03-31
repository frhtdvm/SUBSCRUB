import { useEffect, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { openDatabase } from '../db/database';
import { initSchema } from '../db/schema';
import {
  upsertProfile,
  getProfile,
  getSettings,
  upsertSettings,
  getAllConnections,
  getAllDirectoryEntries,
  seedDirectory,
  getActiveSubscriptions,
  getDirectoryCount,
} from '../db/repositories';
import { calculateWaste } from '../engine/calculateWaste';
import { checkEntitlement, initRevenueCat, isRevenueCatConfigured } from '../api/revenuecat/RevenueCatService';
import cancellationDirectory from '../data/cancellation-directory.json';
import type { CancellationDirectoryEntry } from '../types';

export function useAppInit() {
  const store = useAppStore();

  const initialize = useCallback(async () => {
    try {
      // 1. Open & migrate DB
      await openDatabase();
      await initSchema();

      // 2. Load / create settings
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

      // 3. Seed cancellation directory if needed
      const dirCount = await getDirectoryCount();
      if (dirCount === 0 || !settings.hasSeededDirectory) {
        await seedDirectory(cancellationDirectory as CancellationDirectoryEntry[]);
        await upsertSettings({ hasSeededDirectory: true });
      }

      // 4. Load / create user profile
      let profile = await getProfile();
      if (!profile) {
        profile = await upsertProfile({});
      }
      store.setProfile(profile);

      // 5. Load source connections
      const connections = await getAllConnections();
      store.setConnections(connections);

      // 6. Load subscriptions & waste
      const subs = await getActiveSubscriptions();
      store.setSubscriptions(subs);
      if (subs.length > 0) {
        store.setWasteSummary(calculateWaste(subs));
      }

      // 7. RevenueCat
      await initRevenueCat();
      if (isRevenueCatConfigured()) {
        const isPremium = await checkEntitlement();
        store.setPremium(isPremium);
        if (isPremium) {
          await upsertProfile({ isPremium: true });
        }
      }

      // 8. Determine demo mode
      const isDemo = !isRevenueCatConfigured();
      store.setDemoMode(isDemo);
    } catch {
      // Fail silently – app boots in demo mode
      store.setDemoMode(true);
    }
  }, [store]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return { initialize };
}
