import type { Subscription, WasteSummary } from '../types';

/**
 * Calculate monthly and yearly waste from active subscriptions.
 *
 * monthly_waste = sum(monthly charges) + sum(yearly charges) / 12
 * yearly_waste  = sum(monthly charges) * 12 + sum(yearly charges)
 */
export function calculateWaste(subscriptions: Subscription[]): WasteSummary {
  const active = subscriptions.filter((s) => s.status !== 'cancelled');

  let monthlyFromMonthly = 0;
  let yearlyFromYearly = 0;

  for (const sub of active) {
    if (sub.frequency === 'monthly') {
      monthlyFromMonthly += sub.amount;
    } else if (sub.frequency === 'yearly') {
      yearlyFromYearly += sub.amount;
    }
  }

  const monthlyWaste = monthlyFromMonthly + yearlyFromYearly / 12;
  const yearlyWaste = monthlyFromMonthly * 12 + yearlyFromYearly;
  const currency = active[0]?.currency ?? 'USD';

  return {
    monthlyWaste: Math.round(monthlyWaste * 100) / 100,
    yearlyWaste: Math.round(yearlyWaste * 100) / 100,
    subscriptionCount: active.length,
    currency,
  };
}

/**
 * Calculate amount saved when a subscription is marked cancelled.
 */
export function savedAmount(subscription: Subscription): number {
  if (subscription.frequency === 'yearly') {
    return subscription.amount / 12; // monthly equivalent
  }
  return subscription.amount;
}
