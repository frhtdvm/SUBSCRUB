# SubScrub — The Subscription Sniper

> Privacy-first subscription detection and cancellation app for iOS and Android.

---

## Overview

SubScrub detects recurring subscriptions from bank transactions and inbox receipts, calculates your total monthly/yearly waste, and gives you direct cancellation tools — **all locally on your device**. No data ever leaves your phone.

### Key principles
- **Local-only**: All processing and storage on-device with SQLite (SQLCipher encryption)
- **Read-only access**: Bank and inbox connections are read-only
- **No backend**: No custom server receives or stores your data
- **No analytics**: No crash reporters, no telemetry, no background uploads
- **One-time payment**: No subscriptions in a subscription cutter

---

## Architecture

```
SubScrub/
├── App.tsx                         # Entry point
├── global.css                      # NativeWind CSS
├── app.json                        # Expo config
├── babel.config.js                 # Babel + NativeWind + module resolver
├── metro.config.js                 # Metro + NativeWind
├── tailwind.config.js              # Tailwind theme (hacker-terminal)
├── jest.config.json                # Test config
├── .env.example                    # Required environment variables
├── src/
│   ├── api/
│   │   ├── plaid/                  # Plaid connector (production + demo)
│   │   ├── gmail/                  # Gmail OAuth connector (production + demo)
│   │   ├── outlook/                # Outlook/Graph connector (production + demo)
│   │   └── revenuecat/             # RevenueCat in-app purchase service
│   ├── components/                 # Reusable UI components
│   ├── constants/                  # Colors, thresholds, product IDs
│   ├── data/
│   │   ├── cancellation-directory.json  # 500+ services with cancellation URLs
│   │   ├── demo-transactions.json       # Demo bank transaction data
│   │   └── demo-emails.json             # Demo email artifact data
│   ├── db/
│   │   ├── database.ts             # SQLite/SQLCipher connection
│   │   ├── schema.ts               # Table definitions + migrations
│   │   └── repositories/           # Data access per table (8 repos)
│   ├── engine/
│   │   ├── normalize.ts            # Merchant name normalization
│   │   ├── detectRecurring.ts      # Core detection algorithm
│   │   ├── predictBilling.ts       # Next billing date prediction
│   │   ├── calculateWaste.ts       # Monthly/yearly waste calculation
│   │   └── generateLegalTemplate.ts # GDPR/KVKK/Generic cancellation letters
│   ├── hooks/
│   │   ├── useAppInit.ts           # App initialization + DB + RevenueCat
│   │   └── useScan.ts              # Full scan orchestration
│   ├── navigation/
│   │   ├── AppNavigator.tsx        # Stack + Tab navigation
│   │   └── types.ts                # Navigation param types
│   ├── screens/                    # 9 production screens
│   ├── store/
│   │   └── useAppStore.ts          # Zustand global state
│   ├── tests/
│   │   └── engine.test.ts          # 15+ engine unit tests
│   ├── types/index.ts              # All TypeScript types
│   └── utils/format.ts             # Currency, date, label formatters
└── infra/
    └── plaid-broker/               # Minimal Express.js Plaid proxy
        ├── index.js
        ├── package.json
        └── .env.example
```

---

## Screens

| Screen | Description |
|--------|-------------|
| Splash | Animated logo with glow effect |
| Onboarding | 4-slide privacy-first walkthrough |
| ConnectSources | Bank (Plaid), Gmail, Outlook connections |
| ScanProgress | Real-time scan with animated progress bar |
| Dashboard | Cost overview, waste metrics, top subscriptions |
| SubscriptionList | Filterable list with search |
| SubscriptionDetail | Full detail with cancellation tools (premium gated) |
| Paywall | One-time $19.99 lifetime unlock |
| LegalTemplatePreview | GDPR/KVKK/Generic letter generator |
| Settings | Privacy controls, jurisdiction, data deletion |

---

## Detection Engine

The detection engine runs 100% locally:

1. **Normalize** merchant names via alias map + noise token stripping
2. **Group** transactions by normalized name + approximate amount
3. **Detect recurrence**: Monthly (25-35 day intervals, ≥3 occurrences) or Yearly (330-390 days, ≥2 occurrences)
4. **Score confidence** (0.0-1.0):
   - +0.40 if directory match found
   - +0.20 if interval matches recurrence pattern
   - +0.20 if amount is stable (≤5% variance)
   - +0.20 if cross-source (bank + email) corroboration
5. **Classify**: ≥0.75 → Verified, 0.50-0.74 → Potential Thief, <0.50 → ignored
6. **Predict** next billing date from last charge + median interval

---

## Demo Mode

When no credentials are configured, the app automatically runs in Demo Mode:
- 50+ realistic demo transactions (Netflix, Spotify, Adobe CC, etc.)
- 30 demo email artifacts for cross-source corroboration
- Full detection engine runs on demo data
- Paywall shows "Simulate Unlock" instead of real purchase
- All UI flows work identically to production

---

## Setup for Production

### 1. Mobile App

```bash
cd SubScrub
cp .env.example .env
# Fill in credentials:
# EXPO_PUBLIC_PLAID_BROKER_BASE_URL=https://your-broker.domain.com
# EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=...
# EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=...
# EXPO_PUBLIC_MICROSOFT_CLIENT_ID=...
# EXPO_PUBLIC_REVENUECAT_API_KEY=...

npm install
npx expo start
```

### 2. Plaid Broker

```bash
cd infra/plaid-broker
cp .env.example .env
# Fill in PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV

npm install
npm start
```

### 3. EAS Build (for SQLCipher + production)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform all --profile production
```

---

## Running Tests

```bash
cd SubScrub
npx jest --testPathPattern=src/tests/engine.test.ts --no-coverage
```

---

## Cancellation Directory

The directory at `src/data/cancellation-directory.json` contains **506 services** including:
- Streaming/Entertainment: Netflix, Spotify, Disney+, etc.
- Software/SaaS: Adobe CC, Microsoft 365, GitHub, Figma, etc.
- Cloud/Developer: AWS, GCP, Azure, Vercel, Cloudflare, etc.
- AI/LLM: ChatGPT, Claude, Midjourney, Perplexity, etc.
- VPN/Security: NordVPN, ExpressVPN, Proton, etc.
- Fitness/Health: Peloton, Headspace, Calm, WHOOP, etc.
- News/Media: NYT, WSJ, Bloomberg, etc.
- Education: Coursera, Udemy, Pluralsight, etc.

Each entry includes: provider name, merchant aliases, sender domains, cancellation URL, support email, category, region.

---

## Privacy

SubScrub is designed from first principles for maximum privacy:

| What we do | What we NEVER do |
|-----------|-----------------|
| Read-only bank access via Plaid | Store Plaid credentials on-device |
| Fetch email metadata only (sender, subject, snippet) | Read full email body |
| Store everything locally in encrypted SQLite | Send data to any remote server |
| Use SecureStore for OAuth tokens | Log or transmit tokens |
| Run detection engine on-device | Use third-party analytics |

---

## License

MIT
