# SubScrub — Build Status

Last updated: 2026-02-XX

---

## TypeScript Compile

**Status: CLEAN — 0 errors**

```
npx tsc --noEmit → exit 0
```

---

## Jest Engine Tests

**Status: PASSING — 23/23**

```
npx jest src/tests/engine.test.ts --no-coverage
Test Suites: 1 passed, 1 total
Tests:       23 passed, 23 total
```

### Test Coverage

| Suite               | Tests | Status |
|---------------------|-------|--------|
| normalizeMerchant   | 7     | PASS   |
| normalizeSenderDomain | 2   | PASS   |
| detectRecurring     | 4     | PASS   |
| calculateWaste      | 4     | PASS   |
| generateLegalTemplate | 4   | PASS   |
| predictNextBilling  | 2     | PASS   |

---

## Demo Mode Boot Flow

**Status: VERIFIED (architecture review)**

The full Demo Mode flow is structurally complete and wired:

| Step | Screen            | Trigger                                    | Status |
|------|-------------------|--------------------------------------------|--------|
| 1    | SplashScreen      | App start → `useAppInit` runs DB/schema init | WIRED |
| 2    | OnboardingScreen  | `onboardingComplete = false` (first launch) | WIRED |
| 3    | ConnectSourcesScreen | Onboarding complete                      | WIRED |
| 4    | ScanProgressScreen | "Skip & Use Demo Data" or source connected | WIRED |
| 5    | DashboardScreen (Main) | Scan completes via `useScan` hook      | WIRED |

### Demo Fallback Chain

- **Plaid**: `getDemoTransactions()` from `demo-transactions.json` when `EXPO_PUBLIC_PLAID_*` not set
- **Gmail**: `getDemoEmails()` from `demo-emails.json` when `EXPO_PUBLIC_GOOGLE_CLIENT_ID` not set
- **Outlook**: skipped in demo (no configured credentials)
- **RevenueCat**: `isDemo: true` returns when `EXPO_PUBLIC_REVENUECAT_API_KEY` not set

---

## Production Integration Status

| Integration       | Wired | Demo Fallback | Requires Key |
|-------------------|-------|---------------|--------------|
| Plaid (transactions) | YES | YES           | `EXPO_PUBLIC_PLAID_*` |
| Gmail OAuth       | YES   | YES           | `EXPO_PUBLIC_GOOGLE_CLIENT_ID` |
| Outlook OAuth     | YES   | YES (skip)    | `EXPO_PUBLIC_MS_CLIENT_ID` |
| RevenueCat        | YES   | YES           | `EXPO_PUBLIC_REVENUECAT_API_KEY` |

---

## Remaining Blockers

### For native device verification (iOS / Android)

1. **Native build not run yet.** The app has not been launched on a physical device or simulator. This requires:
   - iOS: `expo run:ios` (requires macOS + Xcode)
   - Android: `expo run:android` (requires Android Studio / emulator)
   - Or Expo Go on device via `expo start`

2. **`expo-sqlite` — native module.** All DB operations use `expo-sqlite`. This works on iOS/Android but requires native build; it does NOT work in Expo Go (SDK 50+) for complex queries. Use a development build (`expo-dev-client`) for full verification.

3. **`react-native-purchases` (RevenueCat) — native module.** Requires native build; crashes in Expo Go.

4. **Font file** (`assets/fonts/SpaceMono-Regular.ttf`) is present. `expo-font` is installed. Font loading is handled via `useFonts` in `App.tsx`.

### For production go-live

- Real API credentials for Plaid, Google OAuth, Microsoft OAuth, RevenueCat (currently all demo).
- Plaid broker (`infra/plaid-broker/`) needs `PLAID_CLIENT_ID`, `PLAID_SECRET`, and deployment.
- App Store / Google Play setup.

---

## Changed Files (this session)

| File | Change |
|------|--------|
| `babel.config.js` | Fixed `api.cache` + `api.env` conflict; removed `@babel/preset-env`; use `babel-preset-expo` for all envs; skip nativewind plugin in test env |
| `src/engine/normalize.ts` | Fixed `normalizeSenderDomain` regex to handle display-name email format `"Name <user@domain>"` |
| `src/constants/index.ts` | Adjusted `CONFIDENCE_WEIGHTS`: `INTERVAL_MATCH: 0.30`, `STABLE_AMOUNT: 0.20` so interval+stable meets `POTENTIAL_LEAK` threshold of 0.50 |
| `src/types/index.ts` | Added `error?: string` field to `RestoreResult` interface |
| `src/screens/SubscriptionDetailScreen.tsx` | Added narrowed `sub` const after null guard to fix TypeScript closure narrowing; updated all inner functions and JSX to use `sub` |
| `package.json` | Added `babel-preset-expo` (devDependency), `expo-font` (dependency) |

---

## Next Steps

1. Run on device / simulator: `expo start` → scan QR with Expo Go, or `expo run:ios` / `expo run:android` with dev build
2. Verify Demo Mode scan end-to-end on native target (SQLite, subscriptions populated, Dashboard shows waste metrics)
3. Add real credentials to `.env` when ready for production testing
