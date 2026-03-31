/**
 * Demo Plaid Connector
 * Returns seeded demo transactions when Plaid broker is not configured.
 * Preserves the same interface as the production connector.
 */

import { v4 as uuidv4 } from 'uuid';
import demoTransactions from '../../data/demo-transactions.json';
import type {
  ConnectorResult,
  TransactionSyncResult,
  TransactionRecord,
} from '../../types';

export async function getDemoTransactions(
  sourceConnectionId: string
): Promise<ConnectorResult<TransactionSyncResult>> {
  await new Promise((r) => setTimeout(r, 800)); // Simulate network delay

  const transactions: TransactionRecord[] = (demoTransactions as TransactionRecord[]).map(
    (t) => ({
      ...t,
      id: uuidv4(),
      sourceConnectionId,
    })
  );

  return {
    success: true,
    isDemo: true,
    data: { transactions, sourceConnectionId },
  };
}
