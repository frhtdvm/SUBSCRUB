# SubScrub — PRD & Status

## Original Problem Statement

Build a full-stack production application named "SubScrub" based on `docs/PRODUCT_SPEC.md` and `docs/RUN_PROMPT.md`. The application must retain all production integration paths and wiring for Plaid, Google OAuth/Gmail, Microsoft OAuth/Outlook, and RevenueCat, but implement fully functional Demo Mode fallbacks so the app boots and all core flows work without any credentials. Keep it production-ready — not MVP.

---

## Tech Stack

- **Frontend/App**: Expo React Native (TypeScript)
- **Styling**: NativeWind (Tailwind CSS for RN)
- **State**: Zustand
- **Navigation**: React Navigation (native stack + bottom tabs)
- **Database**: expo-sqlite (local, on-device, encrypted intent)
- **Testing**: Jest + jest-expo
- **Integrations**: Plaid, Google OAuth/Gmail, Microsoft OAuth/Outlook, RevenueCat

---

## Architecture

```
/app/SubScrub/
├── App.tsx, babel.config.js, tsconfig.json, tailwind.config.js, metro.config.js
├── assets/fonts/SpaceMono-Regular.ttf
├── docs/STATUS.md
├── src/
│   ├── types/index.ts           — All domain types
│   ├── constants/index.ts       — Colors, weights, thresholds
│   ├── utils/format.ts          — Currency, date formatters
│   ├── data/                    — cancellation-directory.json, demo-transactions.json, demo-emails.json
│   ├── db/                      — database.ts, schema.ts, repositories/
│   ├── engine/                  — detectRecurring, predictBilling, calculateWaste, generateLegalTemplate, normalize
│   ├── api/                     — Plaid, Gmail, Outlook (with Demo connectors), RevenueCat
│   ├── store/useAppStore.ts     — Zustand store
│   ├── hooks/                   — useScan.ts, useAppInit.ts
│   ├── navigation/              — AppNavigator.tsx, types.ts
│   ├── components/              — PrimaryButton, SubscriptionCard, WasteMetricCard, DemoBadge, ScreenContainer
│   ├── screens/                 — 9 screens (Splash, Onboarding, ConnectSources, ScanProgress, Dashboard, SubscriptionList, SubscriptionDetail, Paywall, Settings, LegalTemplatePreview)
│   └── tests/                   — engine.test.ts (23 tests), setup.ts
└── infra/plaid-broker/          — Node.js Plaid token-exchange broker
```

---

## What's Been Implemented

### Session 1 (Previous)
- Scaffolded entire Expo project
- NativeWind / Tailwind config
- 500+ cancellation directory entries
- Demo data (transactions, emails)
- DB layer (SQLite) with 8 repositories
- Core detection engine (detectRecurring, calculateWaste, generateLegalTemplate, predictBilling, normalize)
- API connectors (Plaid, Gmail, Outlook, RevenueCat) with Demo fallbacks
- Zustand store + custom hooks (useScan, useAppInit)
- React Navigation (AppNavigator, 9 screens)
- Plaid broker stub

### Session 2 (2026-02)
- Fixed Jest/Babel config (`api.cache` + `api.env` conflict, missing `babel-preset-expo`)
- Fixed `normalizeSenderDomain` regex for display-name email format
- Fixed `CONFIDENCE_WEIGHTS` so interval+stable = 0.50 meets POTENTIAL_LEAK threshold
- Added `error?: string` to `RestoreResult` type
- Fixed TypeScript closure narrowing in `SubscriptionDetailScreen` (added `sub` const after null guard)
- Installed `expo-font` and `babel-preset-expo`
- **Result: 0 TypeScript errors, 23/23 tests passing**
- Created `docs/STATUS.md`

---

## Credentials (Demo Mode)

No credentials required. All integrations fall back to Demo Mode when env vars are absent.

Real credentials needed (for production):
- `EXPO_PUBLIC_PLAID_CLIENT_ID` + `EXPO_PUBLIC_PLAID_SECRET`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
- `EXPO_PUBLIC_MS_CLIENT_ID`
- `EXPO_PUBLIC_REVENUECAT_API_KEY`

---

## Backlog

### P0 — Blocking for native verification
- [ ] Run on iOS simulator (`expo run:ios`) — verifies SQLite, native modules, Demo scan end-to-end
- [ ] Run on Android emulator (`expo run:android`)

### P1 — Next features
- [ ] `SubscriptionListScreen` — search/filter UI polish
- [ ] `ScanProgressScreen` — animated progress bar matching `useScan` stages
- [ ] `SettingsScreen` — jurisdiction picker, demo mode toggle, reset data

### P2 — Production go-live
- [ ] Real Plaid credentials + broker deployment
- [ ] Google OAuth wiring
- [ ] Microsoft OAuth wiring
- [ ] RevenueCat paywall live
- [ ] App Store / Google Play setup
