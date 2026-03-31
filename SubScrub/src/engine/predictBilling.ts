import type { RecurringGroup } from '../types';

/**
 * Predict the next billing date from the last charge and median interval.
 */
export function predictNextBilling(group: RecurringGroup): string | null {
  if (!group.lastChargeDate || !group.medianInterval || group.medianInterval <= 0) {
    return null;
  }

  const last = new Date(group.lastChargeDate);
  const nextMs = last.getTime() + group.medianInterval * 24 * 60 * 60 * 1000;
  return new Date(nextMs).toISOString();
}

/**
 * Predict next billing from explicit lastChargeDate + interval in days.
 */
export function predictFromLastCharge(lastChargeDate: string, intervalDays: number): string {
  const last = new Date(lastChargeDate);
  const nextMs = last.getTime() + intervalDays * 24 * 60 * 60 * 1000;
  return new Date(nextMs).toISOString();
}
