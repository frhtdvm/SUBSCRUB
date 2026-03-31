import { getDb } from '../database';
import type { Subscription, SubscriptionStatus } from '../../types';

const TABLE = 'subscriptions';

function rowToSubscription(row: Record<string, unknown>): Subscription {
  return {
    id: row.id as string,
    providerName: row.provider_name as string,
    normalizedProvider: row.normalized_provider as string,
    amount: row.amount as number,
    currency: row.currency as string,
    frequency: row.frequency as 'monthly' | 'yearly',
    nextBillingDate: (row.next_billing_date as string | null) ?? null,
    category: row.category as Subscription['category'],
    cancellationLink: (row.cancellation_link as string | null) ?? null,
    supportEmail: (row.support_email as string | null) ?? null,
    status: row.status as SubscriptionStatus,
    confidenceScore: row.confidence_score as number,
    detectionSource: row.detection_source as Subscription['detectionSource'],
    lastChargeDate: (row.last_charge_date as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function upsertSubscription(sub: Subscription): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO ${TABLE}
     (id, provider_name, normalized_provider, amount, currency, frequency, next_billing_date, category, cancellation_link, support_email, status, confidence_score, detection_source, last_charge_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sub.id, sub.providerName, sub.normalizedProvider, sub.amount, sub.currency,
      sub.frequency, sub.nextBillingDate, sub.category, sub.cancellationLink,
      sub.supportEmail, sub.status, sub.confidenceScore, sub.detectionSource,
      sub.lastChargeDate, sub.createdAt, sub.updatedAt,
    ]
  );
}

export async function upsertSubscriptions(subs: Subscription[]): Promise<void> {
  for (const sub of subs) {
    await upsertSubscription(sub);
  }
}

export async function getAllSubscriptions(): Promise<Subscription[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM ${TABLE} ORDER BY amount DESC`
  );
  return rows.map(rowToSubscription);
}

export async function getActiveSubscriptions(): Promise<Subscription[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM ${TABLE} WHERE status != 'cancelled' ORDER BY amount DESC`
  );
  return rows.map(rowToSubscription);
}

export async function getSubscriptionById(id: string): Promise<Subscription | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM ${TABLE} WHERE id = ?`,
    [id]
  );
  return row ? rowToSubscription(row) : null;
}

export async function updateSubscriptionStatus(
  id: string,
  status: SubscriptionStatus
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE ${TABLE} SET status=?, updated_at=? WHERE id=?`,
    [status, new Date().toISOString(), id]
  );
}

export async function clearSubscriptions(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`DELETE FROM ${TABLE}`);
}
