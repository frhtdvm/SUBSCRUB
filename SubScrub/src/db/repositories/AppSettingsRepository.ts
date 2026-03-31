import { getDb } from '../database';
import type { AppSettings, Jurisdiction } from '../../types';

const TABLE = 'app_settings';
const SETTINGS_ID = 'app_settings';

function rowToSettings(row: Record<string, unknown>): AppSettings {
  return {
    id: row.id as string,
    isDemoMode: (row.is_demo_mode as number) === 1,
    onboardingComplete: (row.onboarding_complete as number) === 1,
    hasSeededDirectory: (row.has_seeded_directory as number) === 1,
    preferredCurrency: (row.preferred_currency as string) ?? 'USD',
    jurisdiction: (row.jurisdiction as Jurisdiction) ?? 'GENERIC',
    updatedAt: row.updated_at as string,
  };
}

export async function getSettings(): Promise<AppSettings | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM ${TABLE} WHERE id = ?`,
    [SETTINGS_ID]
  );
  return row ? rowToSettings(row) : null;
}

export async function upsertSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const db = await getDb();
  const now = new Date().toISOString();
  const existing = await getSettings();

  if (!existing) {
    const defaults: AppSettings = {
      id: SETTINGS_ID,
      isDemoMode: true,
      onboardingComplete: false,
      hasSeededDirectory: false,
      preferredCurrency: 'USD',
      jurisdiction: 'GENERIC',
      updatedAt: now,
      ...settings,
    };
    await db.runAsync(
      `INSERT INTO ${TABLE} (id, is_demo_mode, onboarding_complete, has_seeded_directory, preferred_currency, jurisdiction, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        defaults.id,
        defaults.isDemoMode ? 1 : 0,
        defaults.onboardingComplete ? 1 : 0,
        defaults.hasSeededDirectory ? 1 : 0,
        defaults.preferredCurrency,
        defaults.jurisdiction,
        defaults.updatedAt,
      ]
    );
    return defaults;
  }

  const updated = { ...existing, ...settings, id: SETTINGS_ID, updatedAt: now };
  await db.runAsync(
    `UPDATE ${TABLE} SET is_demo_mode=?, onboarding_complete=?, has_seeded_directory=?, preferred_currency=?, jurisdiction=?, updated_at=? WHERE id=?`,
    [
      updated.isDemoMode ? 1 : 0,
      updated.onboardingComplete ? 1 : 0,
      updated.hasSeededDirectory ? 1 : 0,
      updated.preferredCurrency,
      updated.jurisdiction,
      updated.updatedAt,
      SETTINGS_ID,
    ]
  );
  return updated;
}
