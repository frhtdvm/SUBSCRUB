/**
 * Formatting utilities for UI display
 */

export function formatCurrency(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDate(isoDate: string | null): string {
  if (!isoDate) return 'Unknown';
  try {
    return new Date(isoDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

export function formatDateRelative(isoDate: string | null): string {
  if (!isoDate) return 'Unknown';
  const date = new Date(isoDate);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 30) return `In ${diffDays}d`;
  if (diffDays < 365) return `In ${Math.round(diffDays / 30)}mo`;
  return `In ${Math.round(diffDays / 365)}yr`;
}

export function formatConfidence(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function maskEmail(email: string): string {
  return email.replace(/(.{2}).+(@.+)/, '$1***$2');
}

export function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    entertainment: 'Entertainment',
    utility: 'Utility',
    software: 'Software',
    fitness: 'Fitness',
    other: 'Other',
  };
  return labels[category] ?? category;
}
