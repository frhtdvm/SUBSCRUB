import { getDb } from '../database';
import type { UserProfile, Jurisdiction } from '../../types';

const TABLE = 'user_profile';
const PROFILE_ID = 'local_user';

function rowToProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: row.id as string,
    isPremium: (row.is_premium as number) === 1,
    lastScanDate: (row.last_scan_date as string | null) ?? null,
    totalSaved: row.total_saved as number,
    preferredCurrency: (row.preferred_currency as string | null) ?? null,
    jurisdiction: (row.jurisdiction as Jurisdiction) ?? 'GENERIC',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getProfile(): Promise<UserProfile | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM ${TABLE} WHERE id = ?`,
    [PROFILE_ID]
  );
  return row ? rowToProfile(row) : null;
}

export async function upsertProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
  const db = await getDb();
  const now = new Date().toISOString();
  const existing = await getProfile();

  if (!existing) {
    const newProfile: UserProfile = {
      id: PROFILE_ID,
      isPremium: false,
      lastScanDate: null,
      totalSaved: 0,
      preferredCurrency: 'USD',
      jurisdiction: 'GENERIC',
      createdAt: now,
      updatedAt: now,
      ...profile,
    };
    await db.runAsync(
      `INSERT INTO ${TABLE} (id, is_premium, last_scan_date, total_saved, preferred_currency, jurisdiction, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newProfile.id,
        newProfile.isPremium ? 1 : 0,
        newProfile.lastScanDate,
        newProfile.totalSaved,
        newProfile.preferredCurrency,
        newProfile.jurisdiction,
        newProfile.createdAt,
        newProfile.updatedAt,
      ]
    );
    return newProfile;
  }

  const updated = { ...existing, ...profile, id: PROFILE_ID, updatedAt: now };
  await db.runAsync(
    `UPDATE ${TABLE} SET is_premium=?, last_scan_date=?, total_saved=?, preferred_currency=?, jurisdiction=?, updated_at=? WHERE id=?`,
    [
      updated.isPremium ? 1 : 0,
      updated.lastScanDate,
      updated.totalSaved,
      updated.preferredCurrency,
      updated.jurisdiction,
      updated.updatedAt,
      PROFILE_ID,
    ]
  );
  return updated;
}

export async function addToTotalSaved(amount: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE ${TABLE} SET total_saved = total_saved + ?, updated_at = ? WHERE id = ?`,
    [amount, new Date().toISOString(), PROFILE_ID]
  );
}

export async function setPremium(isPremium: boolean): Promise<void> {
  await upsertProfile({ isPremium });
}
