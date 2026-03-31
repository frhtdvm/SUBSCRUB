// ─── Core Domain Types ──────────────────────────────────────────────────────

export type SubscriptionFrequency = 'monthly' | 'yearly';

export type SubscriptionCategory =
  | 'entertainment'
  | 'utility'
  | 'software'
  | 'fitness'
  | 'other';

export type SubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'potential_leak';

export type DetectionSource =
  | 'plaid'
  | 'gmail'
  | 'outlook'
  | 'combined';

export type Jurisdiction = 'GDPR' | 'KVKK' | 'GENERIC';

export type SourceType = 'plaid' | 'gmail' | 'outlook';
export type SourceStatus = 'connected' | 'disconnected' | 'error';

export type ScanStatus = 'pending' | 'running' | 'complete' | 'failed';

// ─── Data Models ─────────────────────────────────────────────────────────────

export interface Subscription {
  id: string;
  providerName: string;
  normalizedProvider: string;
  amount: number;
  currency: string;
  frequency: SubscriptionFrequency;
  nextBillingDate: string | null;
  category: SubscriptionCategory;
  cancellationLink: string | null;
  supportEmail: string | null;
  status: SubscriptionStatus;
  confidenceScore: number;
  detectionSource: DetectionSource;
  lastChargeDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  isPremium: boolean;
  lastScanDate: string | null;
  totalSaved: number;
  preferredCurrency: string | null;
  jurisdiction: Jurisdiction;
  createdAt: string;
  updatedAt: string;
}

export interface SourceConnection {
  id: string;
  source: SourceType;
  status: SourceStatus;
  maskedIdentifier: string | null;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionRecord {
  id: string;
  sourceConnectionId: string;
  providerHint: string | null;
  merchantNameRaw: string | null;
  merchantNameNormalized: string | null;
  amount: number;
  currency: string;
  transactionDate: string;
  fingerprint: string;
  rawHash: string;
  createdAt: string;
}

export interface EmailArtifact {
  id: string;
  sourceConnectionId: string;
  providerHint: string | null;
  sender: string;
  subject: string;
  snippet: string | null;
  receivedAt: string;
  fingerprint: string;
  rawHash: string;
  createdAt: string;
}

export interface CancellationDirectoryEntry {
  id: string;
  providerName: string;
  aliases: string[];
  senderDomains: string[];
  merchantAliases: string[];
  category: SubscriptionCategory;
  cancellationLink: string | null;
  supportEmail: string | null;
  region: 'global' | 'us' | 'eu' | 'tr' | 'other';
  requiresLogin: boolean;
}

export interface ScanRun {
  id: string;
  status: ScanStatus;
  sources: SourceType[];
  transactionsProcessed: number;
  emailsProcessed: number;
  subscriptionsFound: number;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

export interface AppSettings {
  id: string;
  isDemoMode: boolean;
  onboardingComplete: boolean;
  hasSeededDirectory: boolean;
  preferredCurrency: string;
  jurisdiction: Jurisdiction;
  updatedAt: string;
}

// ─── Engine Types ─────────────────────────────────────────────────────────────

export interface RecurringGroup {
  normalizedProvider: string;
  rawName: string;
  transactions: TransactionRecord[];
  emails: EmailArtifact[];
  frequency: SubscriptionFrequency | null;
  medianAmount: number;
  medianInterval: number;
  confidenceScore: number;
  directoryMatch: CancellationDirectoryEntry | null;
  lastChargeDate: string | null;
  currency: string;
}

export interface WasteSummary {
  monthlyWaste: number;
  yearlyWaste: number;
  subscriptionCount: number;
  currency: string;
}

export interface LegalTemplate {
  jurisdiction: Jurisdiction;
  subject: string;
  body: string;
}

// ─── Connector Interfaces ─────────────────────────────────────────────────────

export interface ConnectorResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  isDemo?: boolean;
}

export interface PlaidLinkResult {
  publicToken: string;
  institutionName: string;
  maskedAccount: string;
}

export interface TransactionSyncResult {
  transactions: TransactionRecord[];
  sourceConnectionId: string;
}

export interface EmailSyncResult {
  emails: EmailArtifact[];
  sourceConnectionId: string;
}

export interface OAuthConnectResult {
  maskedEmail: string;
  accessToken: string;
  refreshToken?: string;
}

// ─── RevenueCat Types ─────────────────────────────────────────────────────────

export interface PurchaseResult {
  success: boolean;
  entitlementActive: boolean;
  error?: string;
  isDemo?: boolean;
}

export interface RestoreResult {
  success: boolean;
  entitlementActive: boolean;
  error?: string;
  isDemo?: boolean;
}
