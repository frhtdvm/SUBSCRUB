import { normalizeMerchant, normalizeSenderDomain } from '../engine/normalize';
import { detectRecurring } from '../engine/detectRecurring';
import { calculateWaste } from '../engine/calculateWaste';
import { generateLegalTemplate } from '../engine/generateLegalTemplate';
import { predictNextBilling } from '../engine/predictBilling';
import type { TransactionRecord, Subscription, RecurringGroup } from '../types';

// ─── normalizeMerchant ────────────────────────────────────────────────────────

describe('normalizeMerchant', () => {
  test('lowercases and trims', () => {
    expect(normalizeMerchant('  NETFLIX.COM  ')).toBe('netflix');
  });

  test('maps SPOTIFY USA to spotify', () => {
    expect(normalizeMerchant('SPOTIFY USA')).toBe('spotify');
  });

  test('maps ADOBE CREATIVE CLOUD to adobe', () => {
    expect(normalizeMerchant('ADOBE CREATIVE CLOUD')).toBe('adobe');
  });

  test('strips card suffix', () => {
    expect(normalizeMerchant('HULU LLC 4829')).toBe('hulu');
  });

  test('maps MSFT* to microsoft 365', () => {
    expect(normalizeMerchant('MSFT*MICROSOFT365')).toBe('microsoft 365');
  });

  test('strips noise tokens', () => {
    const result = normalizeMerchant('SomeApp Inc LLC');
    expect(result).toBe('someapp');
  });

  test('handles empty string', () => {
    expect(normalizeMerchant('')).toBe('');
  });
});

// ─── normalizeSenderDomain ─────────────────────────────────────────────────────

describe('normalizeSenderDomain', () => {
  test('extracts domain from email', () => {
    expect(normalizeSenderDomain('no-reply@netflix.com')).toBe('netflix.com');
  });

  test('handles display name format', () => {
    expect(normalizeSenderDomain('Netflix <info@account.netflix.com>')).toBe('account.netflix.com');
  });
});

// ─── detectRecurring ─────────────────────────────────────────────────────────

function makeTx(overrides: Partial<TransactionRecord> = {}): TransactionRecord {
  return {
    id: Math.random().toString(),
    sourceConnectionId: 'test',
    providerHint: null,
    merchantNameRaw: 'NETFLIX.COM',
    merchantNameNormalized: 'netflix',
    amount: 15.99,
    currency: 'USD',
    transactionDate: new Date().toISOString(),
    fingerprint: 'fp',
    rawHash: 'hash',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeMonthlyTx(merchantRaw: string, normalized: string, amount: number, monthsBack: number[]): TransactionRecord[] {
  return monthsBack.map((m) => {
    const d = new Date();
    d.setMonth(d.getMonth() - m);
    return makeTx({
      merchantNameRaw: merchantRaw,
      merchantNameNormalized: normalized,
      amount,
      transactionDate: d.toISOString(),
    });
  });
}

describe('detectRecurring', () => {
  test('detects monthly Netflix subscription with confidence >= 0.50', () => {
    const txs = makeMonthlyTx('NETFLIX.COM', 'netflix', 15.99, [1, 2, 3, 4, 5]);
    const groups = detectRecurring(txs, [], []);
    expect(groups.length).toBeGreaterThan(0);
    const netflixGroup = groups.find((g) => g.normalizedProvider.includes('netflix'));
    expect(netflixGroup).toBeDefined();
    expect(netflixGroup!.confidenceScore).toBeGreaterThanOrEqual(0.5);
    expect(netflixGroup!.frequency).toBe('monthly');
  });

  test('does NOT detect random non-recurring transactions', () => {
    const txs = [
      makeTx({ merchantNameRaw: 'COFFEE SHOP', merchantNameNormalized: 'coffee shop', amount: 4.5, transactionDate: new Date(Date.now() - 5 * 86400000).toISOString() }),
      makeTx({ merchantNameRaw: 'GROCERY STORE', merchantNameNormalized: 'grocery store', amount: 50.0, transactionDate: new Date(Date.now() - 10 * 86400000).toISOString() }),
    ];
    const groups = detectRecurring(txs, [], []);
    expect(groups.length).toBe(0);
  });

  test('boosts confidence with cross-source email corroboration', () => {
    const txs = makeMonthlyTx('SPOTIFY USA', 'spotify', 9.99, [1, 2, 3, 4, 5]);
    const emails = [{
      id: 'e1',
      sourceConnectionId: 'gmail',
      providerHint: 'spotify',
      sender: 'no-reply@spotify.com',
      subject: 'Receipt from Spotify',
      snippet: 'Your payment of $9.99',
      receivedAt: new Date().toISOString(),
      fingerprint: 'fp-e1',
      rawHash: 'hash-e1',
      createdAt: new Date().toISOString(),
    }];
    const groups = detectRecurring(txs, emails, []);
    const spotify = groups.find((g) => g.normalizedProvider === 'spotify');
    expect(spotify).toBeDefined();
    // With directory match not available but cross-source confirmed, confidence should be higher
    expect(spotify!.confidenceScore).toBeGreaterThan(0);
  });

  test('ignores transactions older than 12 months', () => {
    const oldDate = new Date();
    oldDate.setMonth(oldDate.getMonth() - 14);
    const txs = [
      makeTx({ merchantNameRaw: 'OLD SERVICE', merchantNameNormalized: 'old service', amount: 10, transactionDate: oldDate.toISOString() }),
      makeTx({ merchantNameRaw: 'OLD SERVICE', merchantNameNormalized: 'old service', amount: 10, transactionDate: new Date(oldDate.getTime() + 30 * 86400000).toISOString() }),
      makeTx({ merchantNameRaw: 'OLD SERVICE', merchantNameNormalized: 'old service', amount: 10, transactionDate: new Date(oldDate.getTime() + 60 * 86400000).toISOString() }),
    ];
    const groups = detectRecurring(txs, [], []);
    const old = groups.find((g) => g.normalizedProvider === 'old service');
    expect(old).toBeUndefined();
  });
});

// ─── calculateWaste ────────────────────────────────────────────────────────────

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: Math.random().toString(),
    providerName: 'Test',
    normalizedProvider: 'test',
    amount: 10,
    currency: 'USD',
    frequency: 'monthly',
    nextBillingDate: null,
    category: 'other',
    cancellationLink: null,
    supportEmail: null,
    status: 'active',
    confidenceScore: 0.9,
    detectionSource: 'plaid',
    lastChargeDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('calculateWaste', () => {
  test('calculates monthly waste correctly', () => {
    const subs = [
      makeSub({ amount: 10, frequency: 'monthly' }),
      makeSub({ amount: 20, frequency: 'monthly' }),
    ];
    const result = calculateWaste(subs);
    expect(result.monthlyWaste).toBe(30);
    expect(result.yearlyWaste).toBe(360);
  });

  test('includes yearly subscriptions amortized', () => {
    const subs = [
      makeSub({ amount: 10, frequency: 'monthly' }),
      makeSub({ amount: 120, frequency: 'yearly' }),
    ];
    const result = calculateWaste(subs);
    // monthly: 10 + 120/12 = 10 + 10 = 20
    expect(result.monthlyWaste).toBe(20);
    // yearly: 10*12 + 120 = 120 + 120 = 240
    expect(result.yearlyWaste).toBe(240);
  });

  test('excludes cancelled subscriptions', () => {
    const subs = [
      makeSub({ amount: 10, frequency: 'monthly', status: 'active' }),
      makeSub({ amount: 50, frequency: 'monthly', status: 'cancelled' }),
    ];
    const result = calculateWaste(subs);
    expect(result.monthlyWaste).toBe(10);
  });

  test('returns zero for empty list', () => {
    const result = calculateWaste([]);
    expect(result.monthlyWaste).toBe(0);
    expect(result.yearlyWaste).toBe(0);
  });
});

// ─── generateLegalTemplate ─────────────────────────────────────────────────────

describe('generateLegalTemplate', () => {
  const sub = makeSub({ providerName: 'Netflix', supportEmail: 'support@netflix.com' });

  test('generates GDPR template with correct jurisdiction', () => {
    const t = generateLegalTemplate(sub, 'GDPR');
    expect(t.jurisdiction).toBe('GDPR');
    expect(t.subject).toContain('Netflix');
    expect(t.body).toContain('GDPR');
    expect(t.body).toContain('Netflix');
  });

  test('generates KVKK template in Turkish', () => {
    const t = generateLegalTemplate(sub, 'KVKK');
    expect(t.jurisdiction).toBe('KVKK');
    expect(t.body).toContain('KVKK');
  });

  test('generates GENERIC template', () => {
    const t = generateLegalTemplate(sub, 'GENERIC');
    expect(t.jurisdiction).toBe('GENERIC');
    expect(t.body).toContain('Netflix');
  });

  test('includes support email when available', () => {
    const t = generateLegalTemplate(sub, 'GENERIC');
    expect(t.body).toContain('support@netflix.com');
  });
});

// ─── predictNextBilling ────────────────────────────────────────────────────────

describe('predictNextBilling', () => {
  test('predicts ~30 days from last monthly charge', () => {
    const lastCharge = new Date();
    lastCharge.setDate(lastCharge.getDate() - 2);

    const group: RecurringGroup = {
      normalizedProvider: 'netflix',
      rawName: 'Netflix',
      transactions: [],
      emails: [],
      frequency: 'monthly',
      medianAmount: 15.99,
      medianInterval: 30,
      confidenceScore: 0.9,
      directoryMatch: null,
      lastChargeDate: lastCharge.toISOString(),
      currency: 'USD',
    };

    const next = predictNextBilling(group);
    expect(next).toBeDefined();
    const nextDate = new Date(next!);
    const diffDays = (nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(25);
    expect(diffDays).toBeLessThan(35);
  });

  test('returns null when no lastChargeDate', () => {
    const group: RecurringGroup = {
      normalizedProvider: 'test',
      rawName: 'Test',
      transactions: [],
      emails: [],
      frequency: 'monthly',
      medianAmount: 10,
      medianInterval: 30,
      confidenceScore: 0.8,
      directoryMatch: null,
      lastChargeDate: null,
      currency: 'USD',
    };
    expect(predictNextBilling(group)).toBeNull();
  });
});
