// Deterministic local normalization engine

// Patterns to strip from merchant names
const CARD_SUFFIX_RE = /\s+\d{4,}$/;
const PUNCTUATION_RE = /[^\w\s]/g;
const SPACE_RE = /\s+/g;
const NOISE_TOKENS = new Set([
  'com', 'www', 'http', 'https', 'inc', 'llc', 'ltd', 'corp', 'co',
  'us', 'usa', 'int', 'intl', 'gmbh', 'ag', 'bv', 'srl', 'sa', 'ab',
  'technologies', 'technology', 'digital', 'online', 'app', 'apps', 'software',
]);

// Merchant alias overrides for known patterns
const ALIAS_MAP: Record<string, string> = {
  'netflix': 'netflix',
  'netflx': 'netflix',
  'spotify': 'spotify',
  'spotif': 'spotify',
  'spotify usa': 'spotify',
  'spotify ab': 'spotify',
  'adobe': 'adobe',
  'adobe creative cloud': 'adobe',
  'adobecc': 'adobe',
  'creative cloud': 'adobe',
  'microsoft': 'microsoft 365',
  'msft': 'microsoft 365',
  'office 365': 'microsoft 365',
  'microsoft 365': 'microsoft 365',
  'microsoft office': 'microsoft 365',
  'apple com bill': 'apple',
  'apple com': 'apple',
  'icloud': 'icloud',
  'apple icloud': 'icloud',
  'openai': 'chatgpt',
  'chatgpt': 'chatgpt',
  'openai chatgpt': 'chatgpt',
  'github': 'github',
  'github inc': 'github',
  'hulu': 'hulu',
  'hulu llc': 'hulu',
  'disneyplus': 'disney+',
  'disney plus': 'disney+',
  'disney': 'disney+',
  'nordvpn': 'nordvpn',
  'nord security': 'nordvpn',
  'notion': 'notion',
  'notion inc': 'notion',
  'amzn': 'amazon',
  'amazon': 'amazon',
  'dropbox': 'dropbox',
  'google one': 'google one',
  'google storage': 'google one',
  'slack': 'slack',
  'zoom': 'zoom',
  'zoom video': 'zoom',
  'grammarly': 'grammarly',
  'hbo max': 'max',
  'hbomax': 'max',
  'max': 'max',
  'youtube': 'youtube premium',
  'youtube premium': 'youtube premium',
  'peacock': 'peacock',
  'paramount': 'paramount+',
  'paramountplus': 'paramount+',
  'crunchyroll': 'crunchyroll',
  'espn': 'espn+',
  'tidal': 'tidal',
  'xbox': 'xbox game pass',
  'playstation': 'playstation plus',
  'psn': 'playstation plus',
  'nintendo': 'nintendo switch online',
  'peloton': 'peloton',
  'headspace': 'headspace',
  'calm': 'calm',
  'duolingo': 'duolingo plus',
  'figma': 'figma',
  'canva': 'canva',
  'shopify': 'shopify',
  'hubspot': 'hubspot',
  'mailchimp': 'mailchimp',
  'twilio': 'twilio',
  'github copilot': 'github copilot',
  'cursor': 'cursor ai',
};

/**
 * Normalize a raw merchant name for matching.
 * Result is stable and deterministic for the same input.
 */
export function normalizeMerchant(raw: string): string {
  if (!raw) return '';

  let name = raw.toLowerCase();

  // Remove card suffix (trailing 4-digit codes)
  name = name.replace(CARD_SUFFIX_RE, '');

  // Replace dots, slashes, underscores with spaces
  name = name.replace(/[._/\\]/g, ' ');

  // Remove punctuation (except spaces/alphanum)
  name = name.replace(PUNCTUATION_RE, ' ');

  // Collapse spaces
  name = name.replace(SPACE_RE, ' ').trim();

  // Check alias map first (full match)
  if (ALIAS_MAP[name]) {
    return ALIAS_MAP[name];
  }

  // Partial alias scan
  for (const [alias, canonical] of Object.entries(ALIAS_MAP)) {
    if (name.startsWith(alias) || name === alias) {
      return canonical;
    }
  }

  // Strip noise suffix tokens
  const tokens = name.split(' ').filter((t) => t.length > 0 && !NOISE_TOKENS.has(t));
  const cleaned = tokens.join(' ').trim();

  return cleaned || name;
}

/**
 * Normalize a sender email domain for directory matching.
 */
export function normalizeSenderDomain(sender: string): string {
  // Handles both plain "user@domain.com" and display-name "Name <user@domain.com>"
  const match = sender.match(/@([^>@\s]+)/);
  if (!match) return sender.toLowerCase();
  return match[1].toLowerCase().trim();
}

/**
 * Create a fingerprint for grouping transactions.
 */
export function makeFingerprint(normalizedName: string, roundedAmount: number): string {
  return `${normalizedName}|${roundedAmount.toFixed(2)}`;
}

/**
 * Round an amount to nearest bracket for grouping (within 15% variance handled by detection).
 */
export function roundAmountBracket(amount: number): number {
  // Group by whole dollar for amounts < $100, $5 buckets for ≥$100
  if (amount < 100) return Math.round(amount * 10) / 10;
  return Math.round(amount / 5) * 5;
}
