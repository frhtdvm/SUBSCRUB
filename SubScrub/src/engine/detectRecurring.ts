import { normalizeMerchant, normalizeSenderDomain } from './normalize';
import type {
  TransactionRecord,
  EmailArtifact,
  CancellationDirectoryEntry,
  RecurringGroup,
  SubscriptionFrequency,
} from '../types';
import {
  MONTHLY_RECURRENCE,
  YEARLY_RECURRENCE,
  CONFIDENCE_WEIGHTS,
  DETECTION_THRESHOLDS,
  SCAN_RANGE_MONTHS,
} from '../constants';

// ─── Interval helpers ────────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  return Math.abs(d2 - d1) / (1000 * 60 * 60 * 24);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function amountVariance(amounts: number[]): number {
  const med = median(amounts);
  if (med === 0) return 0;
  const max = Math.max(...amounts);
  const min = Math.min(...amounts);
  return (max - min) / med;
}

function amountAbsDiff(amounts: number[]): number {
  const max = Math.max(...amounts);
  const min = Math.min(...amounts);
  return max - min;
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

function groupTransactions(
  transactions: TransactionRecord[]
): Map<string, TransactionRecord[]> {
  const groups = new Map<string, TransactionRecord[]>();

  for (const tx of transactions) {
    const key = normalizeMerchant(tx.merchantNameRaw ?? tx.merchantNameNormalized ?? '');
    if (!key) continue;

    const existing = groups.get(key) ?? [];
    existing.push(tx);
    groups.set(key, existing);
  }
  return groups;
}

// ─── Recurrence detection ─────────────────────────────────────────────────────

function detectFrequency(
  sorted: TransactionRecord[]
): { frequency: SubscriptionFrequency | null; medianInterval: number; isStableAmount: boolean } {
  if (sorted.length < 2) return { frequency: null, medianInterval: 0, isStableAmount: false };

  const amounts = sorted.map((t) => t.amount);
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push(daysBetween(sorted[i - 1].transactionDate, sorted[i].transactionDate));
  }

  const medInterval = median(intervals);
  const varPct = amountVariance(amounts);
  const varAbs = amountAbsDiff(amounts);

  // Monthly check
  if (
    sorted.length >= MONTHLY_RECURRENCE.MIN_OCCURRENCES &&
    medInterval >= MONTHLY_RECURRENCE.MIN_INTERVAL_DAYS &&
    medInterval <= MONTHLY_RECURRENCE.MAX_INTERVAL_DAYS &&
    (varPct <= MONTHLY_RECURRENCE.AMOUNT_VARIANCE_PCT || varAbs <= MONTHLY_RECURRENCE.AMOUNT_VARIANCE_ABS)
  ) {
    return {
      frequency: 'monthly',
      medianInterval: medInterval,
      isStableAmount: varPct <= 0.05,
    };
  }

  // Yearly check
  if (
    sorted.length >= YEARLY_RECURRENCE.MIN_OCCURRENCES &&
    medInterval >= YEARLY_RECURRENCE.MIN_INTERVAL_DAYS &&
    medInterval <= YEARLY_RECURRENCE.MAX_INTERVAL_DAYS &&
    (varPct <= YEARLY_RECURRENCE.AMOUNT_VARIANCE_PCT || varAbs <= YEARLY_RECURRENCE.AMOUNT_VARIANCE_ABS)
  ) {
    return {
      frequency: 'yearly',
      medianInterval: medInterval,
      isStableAmount: varPct <= 0.05,
    };
  }

  return { frequency: null, medianInterval: medInterval, isStableAmount: false };
}

// ─── Confidence scoring ────────────────────────────────────────────────────────

function scoreConfidence(params: {
  directoryMatch: boolean;
  intervalMatch: boolean;
  isStableAmount: boolean;
  crossSourceConfirmed: boolean;
}): number {
  let score = 0;
  if (params.directoryMatch) score += CONFIDENCE_WEIGHTS.DIRECTORY_MATCH;
  if (params.intervalMatch) score += CONFIDENCE_WEIGHTS.INTERVAL_MATCH;
  if (params.isStableAmount) score += CONFIDENCE_WEIGHTS.STABLE_AMOUNT;
  if (params.crossSourceConfirmed) score += CONFIDENCE_WEIGHTS.CROSS_SOURCE;
  return Math.min(score, 1.0);
}

// ─── Main detect function ─────────────────────────────────────────────────────

export function detectRecurring(
  transactions: TransactionRecord[],
  emails: EmailArtifact[],
  directory: CancellationDirectoryEntry[]
): RecurringGroup[] {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - SCAN_RANGE_MONTHS);

  const recentTx = transactions.filter(
    (t) => new Date(t.transactionDate) >= cutoff
  );

  const txGroups = groupTransactions(recentTx);
  const results: RecurringGroup[] = [];

  for (const [normalizedName, txList] of txGroups.entries()) {
    if (txList.length < 2) continue;

    const sorted = [...txList].sort(
      (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
    );

    const { frequency, medianInterval, isStableAmount } = detectFrequency(sorted);
    if (!frequency) continue;

    const amounts = sorted.map((t) => t.amount);
    const medAmount = median(amounts);
    const currency = sorted[sorted.length - 1].currency ?? 'USD';
    const lastChargeDate = sorted[sorted.length - 1].transactionDate;
    const rawName = sorted[sorted.length - 1].merchantNameRaw ?? normalizedName;

    // Directory match
    const directoryMatch =
      directory.find((entry) => {
        const allAliases = [
          ...entry.merchantAliases.map((a) => a.toLowerCase()),
          ...entry.aliases.map((a) => a.toLowerCase()),
          entry.providerName.toLowerCase(),
          entry.id.toLowerCase(),
        ];
        return allAliases.some(
          (a) =>
            a.replace(/\*/g, '').includes(normalizedName) ||
            normalizedName.includes(a.replace(/\*/g, ''))
        );
      }) ?? null;

    // Cross-source: check if matching emails exist for this provider
    const senderDomains = directoryMatch?.senderDomains ?? [];
    const crossSourceConfirmed = emails.some((e) => {
      const domain = normalizeSenderDomain(e.sender);
      return (
        senderDomains.some((sd) => domain.includes(sd) || sd.includes(domain)) ||
        (e.providerHint && normalizeMerchant(e.providerHint) === normalizedName)
      );
    });

    const confidenceScore = scoreConfidence({
      directoryMatch: !!directoryMatch,
      intervalMatch: true,
      isStableAmount,
      crossSourceConfirmed,
    });

    results.push({
      normalizedProvider: normalizedName,
      rawName: directoryMatch?.providerName ?? rawName,
      transactions: sorted,
      emails: emails.filter(
        (e) =>
          e.providerHint && normalizeMerchant(e.providerHint) === normalizedName
      ),
      frequency,
      medianAmount: medAmount,
      medianInterval,
      confidenceScore,
      directoryMatch,
      lastChargeDate,
      currency,
    });
  }

  return results.filter(
    (g) => g.confidenceScore >= DETECTION_THRESHOLDS.POTENTIAL_LEAK
  );
}
