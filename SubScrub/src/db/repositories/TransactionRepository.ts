import { getDb } from '../database';
import type { TransactionRecord } from '../../types';

const TABLE = 'transaction_records';

function rowToTransaction(row: Record<string, unknown>): TransactionRecord {
  return {
    id: row.id as string,
    sourceConnectionId: row.source_connection_id as string,
    providerHint: (row.provider_hint as string | null) ?? null,
    merchantNameRaw: (row.merchant_name_raw as string | null) ?? null,
    merchantNameNormalized: (row.merchant_name_normalized as string | null) ?? null,
    amount: row.amount as number,
    currency: row.currency as string,
    transactionDate: row.transaction_date as string,
    fingerprint: row.fingerprint as string,
    rawHash: row.raw_hash as string,
    createdAt: row.created_at as string,
  };
}

export async function insertTransactions(transactions: TransactionRecord[]): Promise<void> {
  const db = await getDb();
  for (const tx of transactions) {
    await db.runAsync(
      `INSERT OR IGNORE INTO ${TABLE} (id, source_connection_id, provider_hint, merchant_name_raw, merchant_name_normalized, amount, currency, transaction_date, fingerprint, raw_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tx.id, tx.sourceConnectionId, tx.providerHint, tx.merchantNameRaw,
        tx.merchantNameNormalized, tx.amount, tx.currency, tx.transactionDate,
        tx.fingerprint, tx.rawHash, tx.createdAt,
      ]
    );
  }
}

export async function getTransactionsInRange(
  startDate: string,
  endDate: string
): Promise<TransactionRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM ${TABLE} WHERE transaction_date >= ? AND transaction_date <= ? ORDER BY transaction_date DESC`,
    [startDate, endDate]
  );
  return rows.map(rowToTransaction);
}

export async function getAllTransactions(): Promise<TransactionRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM ${TABLE} ORDER BY transaction_date DESC`
  );
  return rows.map(rowToTransaction);
}

export async function getTransactionCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM ${TABLE}`
  );
  return row?.cnt ?? 0;
}

export async function clearTransactions(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`DELETE FROM ${TABLE}`);
}
