/**
 * Plaid Connector Interface
 *
 * Production flow:
 * 1. Call broker /link-token to get a link token (broker calls Plaid API server-side)
 * 2. Open Plaid Link SDK with the token
 * 3. On success, call broker /exchange with publicToken to get accessToken
 * 4. Call broker /transactions/sync with accessToken to fetch transactions
 *
 * Security rules:
 * - Plaid client_secret MUST NEVER be in the mobile app
 * - All server-side Plaid calls go through the stateless broker
 * - Broker stores nothing; tokens are passed per-request from SecureStore
 */

import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'uuid';
import type {
  ConnectorResult,
  PlaidLinkResult,
  TransactionSyncResult,
  TransactionRecord,
} from '../../types';
import { normalizeMerchant } from '../../engine/normalize';

const PLAID_ACCESS_TOKEN_KEY = 'plaid_access_token';
const PLAID_CONNECTION_ID_KEY = 'plaid_connection_id';

const BROKER_BASE_URL = process.env.EXPO_PUBLIC_PLAID_BROKER_BASE_URL ?? '';

async function isConfigured(): Promise<boolean> {
  return BROKER_BASE_URL.length > 0;
}

/**
 * Request a Plaid Link token from the broker.
 * Broker calls Plaid's /link/token/create server-side.
 */
export async function createLinkToken(): Promise<ConnectorResult<string>> {
  if (!(await isConfigured())) {
    return { success: false, error: 'Plaid broker not configured', isDemo: true };
  }
  try {
    const resp = await fetch(`${BROKER_BASE_URL}/api/link-token`, { method: 'POST' });
    const json = await resp.json();
    return { success: true, data: json.link_token };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/**
 * Exchange Plaid public token for access token via broker.
 * Access token is stored in SecureStore (never logged or transmitted again).
 */
export async function exchangePublicToken(
  publicToken: string,
  institutionName: string,
  maskedAccount: string
): Promise<ConnectorResult<PlaidLinkResult>> {
  if (!(await isConfigured())) {
    return { success: false, error: 'Plaid broker not configured', isDemo: true };
  }
  try {
    const resp = await fetch(`${BROKER_BASE_URL}/api/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_token: publicToken }),
    });
    const json = await resp.json();
    if (!json.access_token) throw new Error('No access_token returned');

    const connectionId = uuidv4();
    await SecureStore.setItemAsync(PLAID_ACCESS_TOKEN_KEY, json.access_token);
    await SecureStore.setItemAsync(PLAID_CONNECTION_ID_KEY, connectionId);

    return {
      success: true,
      data: { publicToken, institutionName, maskedAccount },
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/**
 * Sync transactions for the last 12 months via broker.
 */
export async function syncTransactions(
  sourceConnectionId: string
): Promise<ConnectorResult<TransactionSyncResult>> {
  if (!(await isConfigured())) {
    return { success: false, error: 'Plaid broker not configured', isDemo: true };
  }
  const accessToken = await SecureStore.getItemAsync(PLAID_ACCESS_TOKEN_KEY);
  if (!accessToken) {
    return { success: false, error: 'Not connected to Plaid' };
  }
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
    const resp = await fetch(`${BROKER_BASE_URL}/api/transactions/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: accessToken,
        start_date: startDate.toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
      }),
    });
    const json = await resp.json();
    const rawTransactions: Array<{
      transaction_id: string;
      merchant_name?: string;
      name?: string;
      amount: number;
      iso_currency_code?: string;
      date: string;
    }> = json.transactions ?? [];

    const transactions: TransactionRecord[] = rawTransactions.map((t) => {
      const rawName = t.merchant_name ?? t.name ?? '';
      const normalized = normalizeMerchant(rawName);
      return {
        id: t.transaction_id,
        sourceConnectionId,
        providerHint: null,
        merchantNameRaw: rawName,
        merchantNameNormalized: normalized,
        amount: Math.abs(t.amount),
        currency: t.iso_currency_code ?? 'USD',
        transactionDate: new Date(t.date).toISOString(),
        fingerprint: `${normalized}|${Math.abs(t.amount).toFixed(2)}|${t.date}`,
        rawHash: t.transaction_id,
        createdAt: new Date().toISOString(),
      };
    });

    return { success: true, data: { transactions, sourceConnectionId } };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/**
 * Disconnect Plaid – removes stored tokens.
 */
export async function disconnectPlaid(): Promise<void> {
  await SecureStore.deleteItemAsync(PLAID_ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(PLAID_CONNECTION_ID_KEY);
}

export async function isPlaidConnected(): Promise<boolean> {
  const token = await SecureStore.getItemAsync(PLAID_ACCESS_TOKEN_KEY);
  return !!token;
}
