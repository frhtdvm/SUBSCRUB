# SubScrub — Production Roadmap

**App:** SubScrub — The Subscription Sniper  
**Model:** One-time purchase (Non-consumable IAP, $9.99)  
**Target:** Global (US, EU, Turkey, MENA, Asia)  
**Last updated:** 2026-02

---

## Architecture Overview

```
User Data Sources
├── A. CSV Upload          → Universal fallback (all countries)
├── B. Email Scan          → Gmail / Outlook (global, receipt-based)
└── C. Bank Connect        → Regional Open Banking APIs
    ├── Plaid              → US, Canada, UK, partial EU
    ├── TrueLayer          → Full EU + UK (PSD2 compliant)
    ├── BDDK / FinanceAPI  → Turkey (Garanti, İşbank, Akbank, YKB...)
    ├── Lean Technologies  → UAE, Saudi Arabia, Egypt, Kuwait, Bahrain
    └── Salt Edge          → Asia, India, Japan + 60+ countries

Detection Engine
├── Rule-based (offline)   → 500+ known services, pattern matching
└── AI Hybrid (optional)   → Unknown transactions → GPT/Claude (user opt-in)

Monetization
└── Non-consumable IAP     → $9.99 one-time (RevenueCat)
    ├── Free tier           → Detect subscriptions, see totals
    └── Premium unlock      → Cancellation letters, export, AI analysis
```

---

## Phase 1 — CSV Upload ✅ DONE
**Status:** IN PROGRESS  
**Effort:** 2 days  
**Value:** Instant value for every user worldwide, zero API dependency

### What it does
- User downloads bank statement from their bank (CSV/Excel)
- Uploads to SubScrub
- Engine parses transactions, detects subscriptions
- Works for ALL banks in ALL countries

### Technical approach
- Web: `<input type="file">` → FileReader API → CSV parser → detection engine
- Native: `expo-document-picker` → read file → same engine
- CSV column detection: auto-detect Date, Description, Amount columns
- Support formats: CSV (comma/semicolon), Excel-like (tab), common bank exports

### Bank CSV formats to support
| Bank | Country | Date format | Separator |
|------|---------|-------------|-----------|
| Chase | US | MM/DD/YYYY | comma |
| Bank of America | US | MM/DD/YYYY | comma |
| HSBC | UK/Global | DD/MM/YYYY | comma |
| Garanti BBVA | Turkey | DD.MM.YYYY | semicolon |
| İş Bankası | Turkey | DD.MM.YYYY | semicolon |
| Akbank | Turkey | DD.MM.YYYY | semicolon |
| Revolut | Global | YYYY-MM-DD | comma |
| N26 | EU | YYYY-MM-DD | comma |
| ING | EU | DD-MM-YYYY | semicolon |

### Deliverables
- [ ] "Connect Source" screen (3 options: CSV, Email, Bank)
- [ ] CSV file picker + parser
- [ ] Auto-detect column mapping (Date / Description / Amount)
- [ ] Run detection engine on parsed transactions
- [ ] Show results with confidence scores
- [ ] Web simulator: fully functional CSV demo
- [ ] Native app: expo-document-picker integration

---

## Phase 2 — IAP Paywall (One-time Purchase)
**Status:** PENDING  
**Effort:** 1-2 days  
**Value:** Monetization unlocked

### Pricing
- **Free:** Detect subscriptions, see totals, basic list
- **SubScrub Pro — $9.99 (one-time):** 
  - Cancellation letters (GENERIC / GDPR / KVKK)
  - AI analysis for unknown transactions
  - Export to PDF/CSV
  - Priority scan (deep email search)
  - Lifetime updates

### Technical approach
- RevenueCat already in codebase (`src/api/revenuecat/RevenueCatService.ts`)
- Product type: **Non-consumable** (not subscription!)
- App Store product ID: `com.subscrub.app.pro`
- Play Store product ID: `subscrub_pro`
- "Restore Purchase" button for device changes
- Web simulator: show paywall UI + mock unlock

### RevenueCat config
```
entitlement: "pro"
offering: "default"
package: "$rc_lifetime" (one-time)
price: $9.99 USD
```

---

## Phase 3 — Banking Layer v1
**Status:** PENDING  
**Effort:** 5-7 days  
**Value:** Real-time bank data, strongest detection accuracy

### Priority order
1. **Plaid** (US/Canada/UK) — largest English-speaking market
2. **BDDK / FinanceAPI** (Turkey) — home market advantage, low competition
3. **TrueLayer** (EU) — PSD2, 2300+ banks, 31 countries

### Plaid Implementation
- Plaid Link SDK via WebView (already stubbed in codebase)
- **Native SDK**: `react-native-plaid-link-sdk` v12.x (Expo Config Plugin required)
  ```bash
  yarn add react-native-plaid-link-sdk
  # Add to app.json plugins: ["react-native-plaid-link-sdk"]
  ```
- Backend endpoint required (Plaid Link Token creation):
  ```python
  POST /api/plaid/link-token  → creates link_token via Plaid API
  POST /api/plaid/exchange    → exchanges public_token for access_token
  GET  /api/plaid/transactions → fetches last 12 months via access_token
  ```
- OAuth flow: PlaidLink component → user authenticates → `onSuccess(publicToken)` → backend exchange
- Credentials needed: `PLAID_CLIENT_ID`, `PLAID_SECRET` (from dashboard.plaid.com)
- Cost: Free sandbox, Free up to 100 items production, then ~$0.30/item/month
- **Web simulator**: Fully functional mock OAuth flow implemented ✅

### BDDK / Turkey Implementation
- **Native SDK**: No official SDK — direct HTTP to TR-API standard
- All major Turkish banks implement TR-API (BDDK mandate since 2021)
- **Aggregator recommended**: FinanceAPI.io — single SDK for all Turkish banks
  ```bash
  # HTTP-based, no npm package needed
  # Base URL: https://api.financeapi.io/v1/
  ```
- OAuth2 PKCE flow: open bank's auth URL → user consents → redirect with auth_code → exchange for token
- Supported: Garanti BBVA, İş Bankası, Akbank, Yapı Kredi, Ziraat, Halkbank, VakıfBank, QNB, Denizbank, Enpara
- Credentials needed: `FINANCEAPI_CLIENT_ID`, `FINANCEAPI_SECRET` (from financeapi.io)
- **Web simulator**: Fully functional mock OAuth flow with 10 Turkish banks ✅

### TrueLayer Implementation
- **Native SDK**: `rn-truelayer-payments-sdk` v3.1.2 (for payments) + TrueLayer Data API (for transactions)
  ```bash
  yarn add rn-truelayer-payments-sdk
  ```
- For transaction data: TrueLayer Data API (REST, no React Native SDK needed)
  ```
  POST https://auth.truelayer.com/connect/token → get access_token
  GET  https://api.truelayer.com/data/v1/accounts/{id}/transactions
  ```
- Covers 31 EU/UK countries, 2300+ banks (PSD2 mandate)
- Credentials needed: `TRUELAYER_CLIENT_ID`, `TRUELAYER_CLIENT_SECRET` (from console.truelayer.com)
- **Web simulator**: Fully functional mock OAuth flow with 10 EU/UK banks ✅

---

## Phase 4 — AI Analysis Engine (Hybrid)
**Status:** PENDING  
**Effort:** 2-3 days  
**Value:** Detects unknown/new services, dramatically improves accuracy

### How it works
```
Transaction arrives
        ↓
Known service? → YES → Rule engine (offline, instant, free)
        ↓ NO
Confidence < 0.4 and unknown merchant?
        ↓
"Unknown transaction detected. Analyze with AI?" [Yes / No]
        ↓ YES (user consent)
GPT-4o-mini API → classify transaction type + suggest service name
        ↓
Show result + add to local learning cache
```

### Privacy guarantee preserved
- Rule engine = 100% offline, no data ever leaves device
- AI analysis = explicit user opt-in per transaction
- Data sent: only merchant name + amount (no account numbers, no PII)

### Technical
- Model: `gpt-4o-mini` (cheapest, fast, accurate for this task)
- Cost: ~$0.0002 per transaction analyzed
- Emergent LLM Key (already available in platform)
- Prompt: "Classify this bank transaction as a subscription service. Merchant: {name}, Amount: {amount}. Return: service_name, category, is_subscription (bool), confidence (0-1)"

---

## Phase 5 — MENA Banking (Lean Technologies)
**Status:** PENDING  
**Effort:** 3-4 days  
**Value:** UAE, Saudi Arabia, Egypt, Kuwait, Bahrain — high-value market

### Coverage
- UAE: Emirates NBD, FAB, ADCB, Mashreq + 40 more
- Saudi Arabia: Al Rajhi, SNB, Riyad Bank + 30 more
- Egypt: CIB, NBE, Banque Misr + 20 more
- Kuwait, Bahrain: Major banks

### Technical approach
- Lean Technologies SDK (React Native compatible)
- OAuth2 similar to Plaid
- Credentials needed: `LEAN_APP_TOKEN`
- Website: lean.mx

---

## Phase 6 — Global Coverage (Salt Edge)
**Status:** PENDING  
**Effort:** 3-4 days  
**Value:** Asia, India, Japan, LatAm + everything else

### Coverage
- 5,000+ banks across 60+ countries
- India: HDFC, SBI, ICICI + AA Framework
- Singapore, Malaysia, Thailand, Indonesia
- Japan, South Korea
- Brazil, Mexico, Argentina

### Technical
- Salt Edge Connect (React Native WebView)
- Credentials needed: `SALT_EDGE_APP_ID`, `SALT_EDGE_SECRET`

---

## Connector Factory Pattern (Technical)

```typescript
// Auto-select correct connector based on user's country
function getBankingConnector(country: string): BankingConnector {
  if (['US','CA'].includes(country))           return new PlaidConnector();
  if (country === 'TR')                         return new BDDKConnector();
  if (EU_COUNTRIES.includes(country))           return new TrueLayerConnector();
  if (MENA_COUNTRIES.includes(country))         return new LeanConnector();
  return new SaltEdgeConnector(); // global fallback
}
```

---

## Monetization Strategy

### Free Tier
- Import data (CSV, email, bank connect)
- See all detected subscriptions
- View total monthly/annual cost
- Basic list view

### Pro — $9.99 one-time
- Generate cancellation letters (GENERIC / GDPR / KVKK)
- AI analysis for unknown transactions
- Export data (PDF report, CSV)
- Deep email scan (last 3 years)
- Priority customer support

### Revenue projections
| Users | Conversion | Revenue |
|-------|-----------|---------|
| 1,000 | 10% | $999 |
| 10,000 | 8% | $7,992 |
| 100,000 | 6% | $59,940 |
| 1,000,000 | 5% | $499,500 |

### Future revenue streams
- B2B API licensing (sell engine to banks/fintechs)
- Affiliate commissions (cheaper alternatives for cancelled services)
- Enterprise/white-label deals

---

## App Store / Play Store Checklist
- [ ] EAS Build — development profile (iOS + Android)
- [ ] TestFlight internal testing group
- [ ] Play Store internal testing
- [ ] App Store metadata (screenshots, description, keywords)
- [ ] Privacy policy URL (required for Open Banking APIs)
- [ ] `eas init` → set real projectId in app.json
- [ ] All production secrets via `eas secret:create`

---

## Progress Tracker

| Phase | Feature | Status | Notes |
|-------|---------|--------|-------|
| 0 | Core engine (23 tests) | ✅ DONE | |
| 0 | Native app scaffold | ✅ DONE | SDK 54, all screens |
| 0 | Web simulator | ✅ DONE | Premium design, English |
| 1 | CSV Upload | ✅ DONE | Web simulator fully functional |
| 2 | IAP Paywall | ✅ DONE | Web simulator — mock purchase, localStorage persistence |
| 3a | Plaid (US) | ✅ DONE | Web simulator OAuth flow + Plaid SDK notes in plan |
| 3b | BDDK (Turkey) | ✅ DONE | Web simulator — Garanti, İşbank, Akbank, YKB, Ziraat + 5 more |
| 3c | TrueLayer (EU) | ✅ DONE | Web simulator — Revolut, Monzo, N26, HSBC, Barclays + 5 more |
| 3d | Lean (MENA) | ✅ DONE | Web simulator — Emirates NBD, Al Rajhi, CIB + 6 more |
| 4 | AI Analysis | ⬜ PENDING | |
| 5 | Lean Tech (MENA) | ⬜ PENDING | |
| 6 | Salt Edge (Global) | ⬜ PENDING | |
