import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAppStore } from '../store/useAppStore';
import { detectRecurring } from '../engine/detectRecurring';
import { predictNextBilling } from '../engine/predictBilling';
import { calculateWaste } from '../engine/calculateWaste';
import { normalizeMerchant } from '../engine/normalize';

// Connectors
import { syncTransactions, isPlaidConnected } from '../api/plaid/PlaidConnector';
import { getDemoTransactions } from '../api/plaid/DemoPlaidConnector';
import { syncGmailEmails, isGmailConnected } from '../api/gmail/GmailConnector';
import { getDemoEmails } from '../api/gmail/DemoGmailConnector';
import { syncOutlookEmails, isOutlookConnected } from '../api/outlook/OutlookConnector';

// Repositories
import {
  insertTransactions,
  getAllTransactions,
  insertEmails,
  getAllEmails,
  upsertSubscriptions,
  getActiveSubscriptions,
  getAllDirectoryEntries,
  createScanRun,
  updateScanRun,
} from '../db/repositories';

import type { Subscription, SourceType } from '../types';
import { DETECTION_THRESHOLDS } from '../constants';

export function useScan() {
  const store = useAppStore();
  const [error, setError] = useState<string | null>(null);

  const runScan = useCallback(
    async (requestedSources?: SourceType[]) => {
      if (store.isScanning) return;

      setError(null);
      const scanId = uuidv4();
      const sources: SourceType[] = requestedSources ?? ['plaid', 'gmail'];

      store.setScanning(true, 0, 'Initializing...');
      await createScanRun(scanId, sources);

      try {
        // Step 1: Collect transactions
        store.setScanProgress(10, 'Connecting to sources...');

        const plaidConnectionId = 'demo-plaid-' + scanId;
        const gmailConnectionId = 'demo-gmail-' + scanId;

        let txCount = 0;
        let emailCount = 0;

        if (sources.includes('plaid')) {
          store.setScanProgress(20, 'Fetching bank transactions...');
          const isConnected = await isPlaidConnected();
          const result = isConnected
            ? await syncTransactions(plaidConnectionId)
            : await getDemoTransactions(plaidConnectionId);

          if (result.success && result.data) {
            const txs = result.data.transactions.map((t) => ({
              ...t,
              merchantNameNormalized: normalizeMerchant(t.merchantNameRaw ?? ''),
            }));
            await insertTransactions(txs);
            txCount += txs.length;
          }
        }

        if (sources.includes('gmail')) {
          store.setScanProgress(40, 'Scanning Gmail receipts...');
          const isConnected = await isGmailConnected();
          const result = isConnected
            ? await syncGmailEmails(gmailConnectionId)
            : await getDemoEmails(gmailConnectionId);

          if (result.success && result.data) {
            await insertEmails(result.data.emails);
            emailCount += result.data.emails.length;
          }
        }

        if (sources.includes('outlook')) {
          store.setScanProgress(55, 'Scanning Outlook receipts...');
          const isConnected = await isOutlookConnected();
          if (isConnected) {
            const result = await syncOutlookEmails(
              'outlook-' + scanId
            );
            if (result.success && result.data) {
              await insertEmails(result.data.emails);
              emailCount += result.data.emails.length;
            }
          }
        }

        // Step 2: Run detection engine
        store.setScanProgress(65, 'Analyzing patterns...');
        const allTransactions = await getAllTransactions();
        const allEmails = await getAllEmails();
        const directory = await getAllDirectoryEntries();

        store.setScanProgress(75, 'Detecting subscriptions...');
        const groups = detectRecurring(allTransactions, allEmails, directory);

        // Step 3: Convert groups to Subscription records
        store.setScanProgress(85, 'Building subscription list...');
        const now = new Date().toISOString();

        const subscriptions: Subscription[] = groups.map((group) => {
          const dirEntry = group.directoryMatch;
          const status =
            group.confidenceScore >= DETECTION_THRESHOLDS.ACTIVE
              ? 'active'
              : 'potential_leak';

          const hasBothSources =
            group.transactions.length > 0 && group.emails.length > 0;

          return {
            id: uuidv4(),
            providerName: dirEntry?.providerName ?? group.rawName,
            normalizedProvider: group.normalizedProvider,
            amount: group.medianAmount,
            currency: group.currency,
            frequency: group.frequency ?? 'monthly',
            nextBillingDate: predictNextBilling(group),
            category: dirEntry?.category ?? 'other',
            cancellationLink: dirEntry?.cancellationLink ?? null,
            supportEmail: dirEntry?.supportEmail ?? null,
            status,
            confidenceScore: group.confidenceScore,
            detectionSource: hasBothSources ? 'combined' : sources.includes('plaid') ? 'plaid' : 'gmail',
            lastChargeDate: group.lastChargeDate,
            createdAt: now,
            updatedAt: now,
          };
        });

        await upsertSubscriptions(subscriptions);

        // Step 4: Refresh store
        store.setScanProgress(95, 'Calculating costs...');
        const allSubs = await getActiveSubscriptions();
        store.setSubscriptions(allSubs);
        const waste = calculateWaste(allSubs);
        store.setWasteSummary(waste);

        await updateScanRun(scanId, {
          status: 'complete',
          transactionsProcessed: txCount,
          emailsProcessed: emailCount,
          subscriptionsFound: subscriptions.length,
          completedAt: new Date().toISOString(),
        });

        store.setScanProgress(100, 'Done!');
      } catch (e) {
        const msg = String(e);
        setError(msg);
        await updateScanRun(scanId, {
          status: 'failed',
          errorMessage: msg,
          completedAt: new Date().toISOString(),
        });
      } finally {
        setTimeout(() => {
          store.setScanning(false, 0, '');
        }, 500);
      }
    },
    [store]
  );

  return { runScan, error };
}
