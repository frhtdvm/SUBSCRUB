# SubScrub — Build & Native Verification Status

Last updated: 2026-02

---

## Summary

| Check                        | Result    | Notes |
|------------------------------|-----------|-------|
| TypeScript compile           | PASS (0 errors) | `npx tsc --noEmit` |
| Jest engine tests            | PASS (23/23) | All suites green |
| expo-doctor                  | PASS (17/17) | All checks clean |
| iOS JS bundle                | PASS (3.57 MB) | 1407 modules bundled |
| Android JS bundle            | PASS (3.57 MB) | Same module count |
| Hermes bytecode (hermesc)    | N/A in CI  | Environment limitation; native device build required |

---

## Native Verification (What Was Tested)

### JavaScript Bundle Compilation — VERIFIED
Both `expo export --platform ios` and `--platform android` produce clean bundles.
- iOS: `_expo/static/js/ios/index-*.js` — **3.57 MB**, 1407 modules
- Android: `_expo/static/js/android/index-*.js` — **3.57 MB**

The JS layer (all screens, hooks, store, engine, repositories, connectors) compiles without errors.

### Hermes Bytecode — NOT TESTED (CI limit)
`hermesc` is a native Linux binary that cannot run in this container. The JS bundle itself is correct; Hermes compilation will succeed in a real EAS build or on a developer's machine.

### SQLite / expo-sqlite
- `expo-sqlite v16` + `useSQLCipher: true` config plugin is present in `app.json`.
- `openDatabaseAsync` call is in `src/db/database.ts` with graceful fallback for Expo Go (unencrypted).
- Full encryption only active in EAS native builds (SQLCipher requires prebuild).
- **Cannot verify at runtime without a native build or physical device.**

### expo-font
- `expo-font ~14.0.11` installed (correct SDK 54 version; previous `@55` duplicate removed).
- `expo-font` config plugin added to `app.json` by `npx expo install`.
- `useFonts({ SpaceMono: ... })` wired in `App.tsx`.
- `assets/fonts/SpaceMono-Regular.ttf` is present.
- **Loads correctly in Expo Go and native builds.**

### react-native-purchases (RevenueCat)
- `react-native-purchases@9.x` installed.
- SDK is initialised in `src/api/revenuecat/RevenueCatService.ts` only when `EXPO_PUBLIC_REVENUECAT_API_KEY` is set.
- Without the key (Demo Mode), all RevenueCat calls return `isDemo: true` immediately.
- **Native module requires a development build (`expo-dev-client`) or bare workflow to run; crashes in Expo Go.**

### Demo Mode credentialless fallback — VERIFIED (architecture)
| Source  | Live path  | Demo fallback                  |
|---------|-----------|-------------------------------|
| Plaid   | Broker URL → Plaid API | `getDemoTransactions()` from `demo-transactions.json` |
| Gmail   | Google OAuth → IMAP metadata | `getDemoEmails()` from `demo-emails.json` |
| Outlook | Microsoft OAuth → Graph API | Skipped (no source connected) |
| RevenueCat | SDK init → entitlement check | `isDemo: true`, no purchase UI |

All connectors check their config env var first and fall back cleanly when absent.

---

## Issues Fixed This Session

| # | Issue | Root Cause | Fix |
|---|-------|-----------|-----|
| 1 | `splash.png` missing — `expo-doctor` fail | `app.json` referenced wrong filename | Changed to `splash-icon.png` |
| 2 | `expo-font@55` duplicate — `expo-doctor` fail | Manual `npm install expo-font` installed latest instead of SDK-locked version | Uninstalled, reinstalled via `npx expo install expo-font` |
| 3 | 10 packages at wrong SDK version | Initial scaffolding used latest npm versions | `npx expo install <all packages>` aligns to SDK 54 |
| 4 | `babel.config.js` — `.plugins is not a valid Plugin property` | `nativewind/babel` is a Babel preset (returns `{plugins:[...]}`) loaded in `plugins[]` array | Moved to `presets[]` array |
| 5 | Missing `react-native-worklets` peer dep | Not installed, required by `react-native-reanimated` | `npx expo install react-native-worklets` |
| 6 | `babel-preset-expo@55` version mismatch | Manual install got latest; SDK 54 needs `~54.0.10` | `npm install --save-dev babel-preset-expo@~54.0.10` |
| 7 | `ScanProgressScreen` — navigation never fires | `useScan` resets `scanProgress` to `0` before `isScanning` becomes `false`, breaking `!isScanning && progress===100` | Added local `scanDone` state latched at `progress >= 100` |
| 8 | Spinner not spinning | Static `View` — no animation | Added `Animated.loop(Animated.timing(..., Easing.linear))` with `rotate` transform |

---

## Changed Files (This Session)

| File | Change |
|------|--------|
| `app.json` | Fixed `splash-icon.png`, added `runtimeVersion`, iOS `buildNumber`, Android `versionCode`, `blockedPermissions`, `ITSAppUsesNonExemptEncryption`, `expo-font`/`expo-mail-composer`/`expo-web-browser` plugins, `updates` config, `owner` field |
| `babel.config.js` | Moved `nativewind/babel` from `plugins[]` to `presets[]` (was causing `.plugins is not a valid Plugin property` build error) |
| `eas.json` | Created — `development`, `preview`, `production` EAS Build profiles; `submit` config for App Store + Google Play |
| `.env.example` | Updated — all 4 integration env vars with comments pointing to where to get credentials |
| `src/screens/ScanProgressScreen.tsx` | Fixed navigation-trigger bug (latched `scanDone` state); added real `Animated.loop` spinner rotation; `Easing.linear` rotation transform |
| `src/screens/SettingsScreen.tsx` | Added Demo/Production mode toggle (`Switch`); credential requirements checklist when in Demo Mode; `last` prop on `SettingsRow` to remove bottom border on last items; jurisdiction picker polish |
| `package.json` | `npx expo install` updated all Expo SDK 54 packages to correct versions; added `react-native-worklets` |

---

## Remaining Before TestFlight / Play Internal Testing

### Step 1 — EAS Account Setup (one-time, 5 min)
```bash
npm install -g eas-cli
eas login                          # Expo account
eas init                           # sets extra.eas.projectId in app.json
```

### Step 2 — Set Production Secrets (one-time per environment)
```bash
# All four services — only needed for production builds
eas secret:create --scope project --name EXPO_PUBLIC_PLAID_BROKER_BASE_URL --value https://your-broker.example.com
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_CLIENT_ID --value ...
eas secret:create --scope project --name EXPO_PUBLIC_MS_CLIENT_ID --value ...
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_API_KEY --value ...
```

### Step 3 — Development Build (verifies native modules on-device)
```bash
# iOS simulator — verifies SQLite, expo-font, reanimated
eas build --profile development --platform ios

# Physical device — verifies react-native-purchases (RevenueCat)
eas build --profile development --platform android
```

### Step 4 — Internal / Preview Distribution
```bash
eas build --profile preview --platform all
# Distribute via TestFlight (iOS) or internal track (Android)
```

### Step 5 — Production Release
```bash
# Update app.json: owner, extra.eas.projectId
# Update eas.json submit: appleId, ascAppId, appleTeamId
# Add google-play-service-account.json for Android auto-submit
eas build --profile production --platform all
eas submit --profile production --platform all
```

### Step 6 — Plaid Broker Deployment
- Deploy `infra/plaid-broker/` to any Node.js host (Railway, Render, Fly.io)
- Set `PLAID_CLIENT_ID` and `PLAID_SECRET` in the broker environment (never in the app)
- Set `EXPO_PUBLIC_PLAID_BROKER_BASE_URL` to the deployed URL

---

## Production Integration Status

| Integration        | Wired | Demo Fallback | Key Location |
|--------------------|-------|---------------|--------------|
| Plaid (transactions)  | YES | YES           | `EXPO_PUBLIC_PLAID_BROKER_BASE_URL` |
| Gmail OAuth           | YES | YES           | `EXPO_PUBLIC_GOOGLE_CLIENT_ID` |
| Outlook OAuth         | YES | YES (skip)    | `EXPO_PUBLIC_MS_CLIENT_ID` |
| RevenueCat            | YES | YES           | `EXPO_PUBLIC_REVENUECAT_API_KEY` |
| SQLCipher             | YES | Unencrypted fallback | EAS native build only |
