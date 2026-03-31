# SubScrub — Production Product Spec

## Product
SubScrub is a privacy-first, local-first mobile app that detects recurring subscriptions and helps users cancel them.

Tagline: The Subscription Sniper

## Product Mandate
Build the full production app.
This is not an MVP, prototype, throwaway demo, or partial foundation task.

The codebase must be suitable for:
- release hardening
- device QA
- production env wiring
- final deployment preparation

## Non-Negotiables
1. Do not change the stack.
2. Do not add recurring billing.
3. Do not send financial data, email contents, or scan results to any custom backend.
4. Do not add analytics, ads, tracking, session replay, or remote logging.
5. Do not log sensitive data.
6. Store all user data locally and encrypted.
7. Run subscription detection on-device.
8. If credentials are missing, the app must still run in Demo Mode.
9. Do not ask for clarification if a default exists in this spec.
10. Build a mobile app, not a web app.

## Fixed Stack
- React Native with Expo + TypeScript
- React Navigation
- NativeWind
- SQLite with SQLCipher
- Expo SecureStore
- Plaid
- Google OAuth2 + Gmail API
- Microsoft OAuth2 + Graph Mail API
- local rule-based detection engine
- RevenueCat
- iOS + Android
- Expo prebuild / custom dev client / EAS build

## Monetization
### Free
- connect sources
- run scans
- view dashboard
- view subscription list
- view subscription details

### Paid — one-time only
- cancellation links
- legal cancellation templates
- premium cancellation actions

### RevenueCat
- entitlement: `lifetime_unlock`
- product type: non-consumable
- suggested product id: `subscrumb_lifetime_1999`

### Never add
- subscriptions
- trials
- annual plans
- consumables
- coins
- credits

## Core Scope
The production build must include all of the following.

### Onboarding + App Flow
- splash
- onboarding
- connect sources
- scan progress
- dashboard
- subscription list
- subscription detail
- paywall
- settings / privacy
- legal template preview

### Source Integrations
- Plaid connector architecture
- Gmail connector architecture
- Outlook connector architecture
- proper interface boundaries for all connectors
- graceful credential-aware fallback behavior

### Local Data Layer
- encrypted DB schema
- repositories
- seed flow
- local cancellation directory seed
- local app settings
- local user profile
- local scan history

### Detection Engine
- provider normalization
- recurring charge grouping
- confidence scoring
- billing date prediction
- waste calculation
- suspicious charge classification

### Cancellation Features
- provider matching from local cancellation directory
- cancellation links
- support email handling
- GDPR template generation
- KVKK template generation
- GENERIC template generation
- native mail composer
- mark subscription cancelled
- saved total update

### Premium Gating
- RevenueCat entitlement check
- restore purchases
- premium gate only on:
  - cancellation links
  - legal templates
  - premium cancellation actions

### Privacy + Security
- encrypted local storage
- delete all local data
- no analytics
- no tracking
- no remote user-data backend
- minimum permission scopes
- safe production logging rules

### Quality
- tests for core business logic
- README
- `.env.example`
- production-oriented folder structure

## Non-Goals
Do not build:
- web app
- desktop app
- user accounts
- cloud sync
- custom backend for user data
- remote DB
- chatbot
- auto-cancellation
- OCR
- attachment scanning in v1

## Architecture
### Local-First
- encrypted local DB is the source of truth
- recurring detection runs locally
- app remains usable offline after sync
- synced external data is persisted locally for product functionality

### Allowed External Services
- Plaid
- Gmail API
- Microsoft Graph API
- RevenueCat

No other outbound product dependencies should be introduced unless absolutely required by the fixed stack.

## Plaid Broker Rule
Use a minimal stateless Plaid broker only for:
- link token creation
- public token exchange
- transaction sync proxy

Broker must:
- store nothing
- log nothing
- persist no tokens
- persist no transactions
- persist no PII

If the broker is unavailable:
- keep Plaid behind an interface
- preserve the real integration structure
- keep the app functional in Demo Mode

## Demo Mode Rule
If any required external credentials are missing:
- the app must still boot
- the app must remain navigable
- the app must show Demo Mode clearly
- local mock data must be loaded
- scanning must still work end-to-end
- dashboard and list must render computed values
- production architecture must remain intact

Demo Mode is a fallback, not the target product.

## Core UX
### First Launch
1. privacy-first onboarding
2. explain read-only access
3. explain local encryption
4. explain no analytics
5. explain no recurring billing
6. choose source connection path
7. run first scan
8. land on dashboard

### Required Screens
- Splash / Onboarding
- Connect Sources
- Scan Progress
- Dashboard
- Subscription List
- Subscription Detail
- Paywall
- Settings / Privacy
- Legal Template Preview

### Theme
- background: `#000000`
- primary: `#39FF14`
- warning: `#FF3131`
- dark-only
- security / hacker-terminal vibe

### Required Labels
- Verified
- Potential Thief
- Cancelled

### Cancellation Success Tone
Use:
More money stays in your pocket.

## Data Models
Use ISO 8601 strings.

```ts
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
  source: 'plaid' | 'gmail' | 'outlook';
  status: 'connected' | 'disconnected' | 'error';
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
```

## Required Tables
- user_profile
- source_connections
- transaction_records
- email_artifacts
- subscriptions
- scan_runs
- cancellation_directory
- app_settings

## Detection Engine
Use deterministic local rules across the last 12 months of data.

### Normalize
- lowercase
- trim
- remove punctuation
- remove card suffix noise
- collapse spaces
- map aliases from local directory

Examples:
- `NETFLIX.COM`
- `Netflix`
- `NETFLIX 12345`

all normalize to:

- `netflix`

Examples:
- `SPOTIFY USA`
- `Spotify AB`

normalize to:

- `spotify`

### Grouping
Group by:
- normalized provider fingerprint
- approximate amount
- source type

### Monthly Recurrence
- at least 3 occurrences
- median interval between 25 and 35 days
- amount variance <= 15% or <= 3 currency units

### Yearly Recurrence
- at least 2 occurrences
- median interval between 330 and 390 days
- amount variance <= 15% or <= 15 currency units

### Confidence Score
- +0.40 directory match
- +0.20 interval match
- +0.20 stable amount
- +0.20 bank + email agreement

### Decision Thresholds
- `>= 0.75` => active
- `0.50–0.74` => potential_leak
- `< 0.50` => ignore

### Next Billing
Predict from:
- last charge date
- median interval

### Waste Calculation
- monthly waste = monthly charges + yearly charges / 12
- yearly waste = monthly charges * 12 + yearly charges

## Cancellation Engine
- use a local JSON directory with at least 500 popular services
- seed it into the encrypted DB on first launch
- show direct cancellation link if matched
- generate GDPR / KVKK / GENERIC templates locally
- open native mail composer
- never auto-send mail
- no LLM dependency required for template generation

## Security + Privacy Rules
1. Encrypt DB with SQLCipher.
2. Store DB key only in SecureStore.
3. Strip or block production console misuse.
4. Never log tokens, transactions, snippets, SQL rows, mail contents, or purchase payloads.
5. No analytics SDK.
6. No crash reporter that uploads sensitive user data.
7. No remote feature flags.
8. No background uploads of user data.
9. Add Delete All Local Data.
10. Ask minimum scopes only.
11. Do not download attachments in v1.
12. Prefer sender / subject / snippet over full mail body where possible.
13. Never embed Plaid secret in the mobile app.
14. Keep all user financial and email artifacts out of custom backends.

## Project Structure
```text
/SubScrub
  /infra
    /plaid-broker
  /src
    /api
      /plaid
      /gmail
      /outlook
      /revenuecat
    /components
    /constants
    /data
      cancellation-directory.json
      demo-transactions.json
      demo-emails.json
    /db
    /engine
      normalize.ts
      detectRecurring.ts
      predictBilling.ts
      calculateWaste.ts
      generateLegalTemplate.ts
    /hooks
    /navigation
    /screens
    /store
    /types
    /utils
    /tests
  app.json
  package.json
  README.md
  .env.example
```

## Environment Variables
```bash
EXPO_PUBLIC_REVENUECAT_API_KEY=
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=lifetime_unlock

EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=
EXPO_PUBLIC_MICROSOFT_CLIENT_ID=

PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
PLAID_REDIRECT_URI=
PLAID_BROKER_BASE_URL=
```

### Env Rules
- Plaid secrets are broker-only.
- The mobile app must never contain the Plaid secret.
- Missing envs must trigger Demo Mode where applicable.
- The app must not crash due to missing credentials.

## Production Delivery Requirements
The repo must include:
- working Expo app
- production navigation structure
- production screen flows
- real premium gating architecture
- local encrypted persistence
- demo dataset
- connector interfaces
- RevenueCat integration
- cancellation flow
- privacy controls
- tests
- README
- `.env.example`

## Acceptance Criteria
The task is complete only if all are true:

### Product
- runs on iOS and Android
- no account creation
- no custom user-data backend
- free users can scan and view
- paid users can access cancellation links and legal templates
- no recurring billing anywhere in product logic

### Privacy
- local encrypted DB exists
- no analytics / tracking SDK
- no sensitive console logs
- user can delete all local data

### Functionality
- Demo Mode works without credentials
- dashboard shows monthly and yearly waste
- subscription list and detail are functional
- unknown recurring charges can appear as Potential Thief
- cancellation flow exists
- legal template generation exists
- mark-as-cancelled exists
- total saved updates correctly

### Code Quality
- core business logic is tested
- connector logic is isolated behind interfaces
- project structure is production-oriented
- app is suitable for final QA and release hardening

## Defaults
- DB: SQLite + SQLCipher
- detection: rule-based only
- theme: dark-only
- scan range: last 12 months
- uncertain label: Potential Thief
- categories: entertainment, utility, software, fitness, other
- default jurisdiction: GENERIC
- send mail only through native composer
- cancel action: deep link if possible, else web URL
- no cloud sync
- no OCR
- no attachment scanning
- no telemetry
