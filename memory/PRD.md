# SubScrub — PRD & Status

## Original Problem Statement

Build a full-stack production application named "SubScrub" based on `docs/PRODUCT_SPEC.md` and `docs/RUN_PROMPT.md`. The application must retain all production integration paths and wiring for Plaid, Google OAuth/Gmail, Microsoft OAuth/Outlook, and RevenueCat, but implement fully functional Demo Mode fallbacks so the app boots and all core flows work without any credentials. Keep it production-ready — not MVP.

---

## Tech Stack

- **App**: Expo React Native (TypeScript), SDK 54
- **Styling**: NativeWind 4.x (Tailwind CSS for RN)
- **State**: Zustand 4.x
- **Navigation**: React Navigation 7.x (native stack + bottom tabs)
- **Database**: expo-sqlite v16 (local, SQLCipher encryption in EAS builds)
- **Testing**: Jest 29 + jest-expo
- **Integrations**: Plaid (broker pattern), Google OAuth/Gmail, Microsoft OAuth/Outlook, RevenueCat

---

## Architecture

```
/app/SubScrub/
├── App.tsx                          — Root: font loading, NavigationContainer, GestureHandlerRootView
├── app.json                         — Expo config with full iOS/Android production metadata
├── eas.json                         — EAS Build profiles: development / preview / production
├── babel.config.js                  — babel-preset-expo + nativewind/babel (as preset) + module-resolver
├── metro.config.js                  — withNativeWind(config, { input: './global.css' })
├── tailwind.config.js               — NativeWind preset + SubScrub color tokens
├── .env.example                     — All EXPO_PUBLIC_* vars with comments
├── assets/fonts/SpaceMono-Regular.ttf
├── docs/STATUS.md                   — Build status and native verification log
├── infra/plaid-broker/              — Node.js stateless Plaid token-exchange broker
└── src/
    ├── types/index.ts               — All domain types + connector/result interfaces
    ├── constants/index.ts           — Colors, CONFIDENCE_WEIGHTS, thresholds, frequency config
    ├── utils/format.ts              — Currency, date, confidence formatters
    ├── data/                        — cancellation-directory.json, demo-transactions.json, demo-emails.json
    ├── db/                          — database.ts (SQLite/SQLCipher), schema.ts, repositories/
    ├── engine/                      — detectRecurring, predictBilling, calculateWaste, generateLegalTemplate, normalize
    ├── api/
    │   ├── plaid/                   — PlaidConnector.ts (production) + DemoPlaidConnector.ts
    │   ├── gmail/                   — GmailConnector.ts (production) + DemoGmailConnector.ts
    │   ├── outlook/                 — OutlookConnector.ts (production) + DemoOutlookConnector.ts
    │   └── revenuecat/              — RevenueCatService.ts (production, always demo when key absent)
    ├── store/useAppStore.ts         — Zustand global store
    ├── hooks/                       — useScan.ts, useAppInit.ts
    ├── navigation/                  — AppNavigator.tsx (Stack + BottomTabs), types.ts
    ├── components/                  — PrimaryButton, SubscriptionCard, WasteMetricCard, DemoBadge, ScreenContainer
    ├── screens/                     — 10 screens
    └── tests/                       — engine.test.ts (23 tests), setup.ts
```

---

## Implemented Screens

| Screen | Status | Notes |
|--------|--------|-------|
| SplashScreen | DONE | Font load gated, animated fade+glow, routes to Onboarding or Main |
| OnboardingScreen | DONE | 4-slide privacy-first flow |
| ConnectSourcesScreen | DONE | Demo connect simulation + production OAuth paths |
| ScanProgressScreen | DONE | Animated spinner (Easing.linear loop), animated progress bar, fixed nav trigger |
| DashboardScreen | DONE | Waste metrics, top drains, rescan, demo badge |
| SubscriptionListScreen | DONE | Full list with status filter |
| SubscriptionDetailScreen | DONE | Cost highlight, cancellation options, legal templates (premium gated) |
| LegalTemplatePreviewScreen | DONE | GDPR/KVKK/GENERIC template + Mail composer |
| PaywallScreen | DONE | RevenueCat purchase + restore |
| SettingsScreen | DONE | Demo/Production toggle with credential checklist, jurisdiction picker, delete all |

---

## Completed Sessions

### Session 1 (Previous Agent)
- Scaffolded entire Expo project
- NativeWind / Tailwind config
- 500+ cancellation directory entries, demo data
- DB layer (SQLite) with 8 repositories
- Core detection engine (23 tests)
- API connectors (Plaid, Gmail, Outlook, RevenueCat) with Demo fallbacks
- Zustand store + hooks (useScan, useAppInit)
- React Navigation (AppNavigator, 10 screens)
- Plaid broker stub

### Session 2 (2026-02)
- Fixed Babel/Jest config (cache + api.env conflict, babel-preset-expo install)
- Fixed engine tests: normalizeSenderDomain regex, CONFIDENCE_WEIGHTS
- Added `error?: string` to RestoreResult type
- Fixed TypeScript closure narrowing in SubscriptionDetailScreen
- Result: 0 TS errors, 23/23 tests

### Session 3 (2026-02) — Native Verification
- Fixed all 8 native build blockers (listed in docs/STATUS.md)
- expo-doctor: 17/17 checks pass
- iOS + Android bundles export cleanly (3.57 MB, 1407 modules)
- Implemented ScanProgressScreen: real spinner animation + navigation fix
- Implemented SettingsScreen: Demo/Production mode toggle + credential checklist
- Created eas.json (development / preview / production profiles)
- Updated app.json with full App Store / Google Play production metadata
- Created .env.example with all credential requirements

---

## Credentials

No credentials required. All integrations fall back to Demo Mode.

Real credentials needed (set via `eas secret:create`):
- `EXPO_PUBLIC_PLAID_BROKER_BASE_URL`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` + `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` + `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
- `EXPO_PUBLIC_MS_CLIENT_ID`
- `EXPO_PUBLIC_REVENUECAT_API_KEY`

---

## P0 Backlog (Before TestFlight / Play Internal Testing)

- [ ] Run `eas init` to set real `extra.eas.projectId` in app.json
- [ ] `eas build --profile development --platform ios` — verifies SQLite, fonts, reanimated on simulator
- [ ] `eas build --profile development --platform android` — verifies react-native-purchases
- [ ] Deploy `infra/plaid-broker/` and set `EXPO_PUBLIC_PLAID_BROKER_BASE_URL`
- [ ] Set all 4 production secrets via `eas secret:create`
- [ ] Fill in `eas.json submit` fields: `appleId`, `ascAppId`, `appleTeamId`
- [ ] Add `google-play-service-account.json` for Android auto-submit

## P1 Backlog

- [ ] SubscriptionListScreen — search/filter UI polish
- [ ] Plaid Link SDK integration (`expo-plaid-link` or WebView-based link flow)
- [ ] Background scan scheduling (optional, Expo background tasks)

## P2 Backlog

- [ ] App Store screenshots and metadata
- [ ] Google Play store listing
- [ ] TestFlight external testing group setup
