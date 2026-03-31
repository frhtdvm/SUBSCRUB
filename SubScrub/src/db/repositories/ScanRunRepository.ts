import { getDb } from '../database';
import type { ScanRun, ScanStatus, SourceType } from '../../types';

const TABLE = 'scan_runs';

function rowToScanRun(row: Record<string, unknown>): ScanRun {
  let sources: SourceType[] = [];
  try {
    sources = JSON.parse(row.sources as string);
  } catch {
    sources = [];
  }
  return {
    id: row.id as string,
    status: row.status as ScanStatus,
    sources,
    transactionsProcessed: row.transactions_processed as number,
    emailsProcessed: row.emails_processed as number,
    subscriptionsFound: row.subscriptions_found as number,
    startedAt: row.started_at as string,
    completedAt: (row.completed_at as string | null) ?? null,
    errorMessage: (row.error_message as string | null) ?? null,
  };
}

export async function createScanRun(id: string, sources: SourceType[]): Promise<ScanRun> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO ${TABLE} (id, status, sources, transactions_processed, emails_processed, subscriptions_found, started_at, completed_at, error_message)
     VALUES (?, 'running', ?, 0, 0, 0, ?, NULL, NULL)`,
    [id, JSON.stringify(sources), now]
  );
  return {
    id, status: 'running', sources, transactionsProcessed: 0,
    emailsProcessed: 0, subscriptionsFound: 0, startedAt: now,
    completedAt: null, errorMessage: null,
  };
}

export async function updateScanRun(
  id: string,
  update: Partial<Pick<ScanRun, 'status' | 'transactionsProcessed' | 'emailsProcessed' | 'subscriptionsFound' | 'completedAt' | 'errorMessage'>>
): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (update.status !== undefined) { fields.push('status=?'); values.push(update.status); }
  if (update.transactionsProcessed !== undefined) { fields.push('transactions_processed=?'); values.push(update.transactionsProcessed); }
  if (update.emailsProcessed !== undefined) { fields.push('emails_processed=?'); values.push(update.emailsProcessed); }
  if (update.subscriptionsFound !== undefined) { fields.push('subscriptions_found=?'); values.push(update.subscriptionsFound); }
  if (update.completedAt !== undefined) { fields.push('completed_at=?'); values.push(update.completedAt ?? null); }
  if (update.errorMessage !== undefined) { fields.push('error_message=?'); values.push(update.errorMessage ?? null); }

  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE ${TABLE} SET ${fields.join(', ')} WHERE id=?`, values);
}

export async function getLatestScanRun(): Promise<ScanRun | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM ${TABLE} ORDER BY started_at DESC LIMIT 1`
  );
  return row ? rowToScanRun(row) : null;
}
