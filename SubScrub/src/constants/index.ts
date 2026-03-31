export const Colors = {
  background: '#000000',
  surface: '#0A0A0A',
  card: '#111111',
  cardElevated: '#161616',
  border: '#1E1E1E',
  borderLight: '#2A2A2A',
  primary: '#39FF14',
  primaryDim: '#1A7A07',
  primaryGlow: 'rgba(57,255,20,0.15)',
  warning: '#FF3131',
  warningDim: '#7A1515',
  warningGlow: 'rgba(255,49,49,0.15)',
  text: '#FFFFFF',
  textSecondary: '#CCCCCC',
  textMuted: '#888888',
  textDim: '#555555',
  verified: '#39FF14',
  potentialThief: '#FF3131',
  cancelled: '#555555',
  overlay: 'rgba(0,0,0,0.85)',
};

export const Fonts = {
  mono: 'SpaceMono',
  regular: 'System',
};

export const ENTITLEMENT_ID = 'lifetime_unlock';
export const PRODUCT_ID = 'subscrumb_lifetime_1999';
export const LIFETIME_PRICE = '$19.99';

export const DEMO_MODE_LABEL = 'DEMO MODE';

export const DETECTION_THRESHOLDS = {
  ACTIVE: 0.75,
  POTENTIAL_LEAK: 0.50,
} as const;

export const CONFIDENCE_WEIGHTS = {
  DIRECTORY_MATCH: 0.35,
  INTERVAL_MATCH: 0.30,
  STABLE_AMOUNT: 0.20,
  CROSS_SOURCE: 0.15,
} as const;

export const MONTHLY_RECURRENCE = {
  MIN_OCCURRENCES: 3,
  MIN_INTERVAL_DAYS: 25,
  MAX_INTERVAL_DAYS: 35,
  AMOUNT_VARIANCE_PCT: 0.15,
  AMOUNT_VARIANCE_ABS: 3,
} as const;

export const YEARLY_RECURRENCE = {
  MIN_OCCURRENCES: 2,
  MIN_INTERVAL_DAYS: 330,
  MAX_INTERVAL_DAYS: 390,
  AMOUNT_VARIANCE_PCT: 0.15,
  AMOUNT_VARIANCE_ABS: 15,
} as const;

export const SCAN_RANGE_MONTHS = 12;
