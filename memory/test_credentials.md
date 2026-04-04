# SubScrub — Test Credentials

## Auth
No authentication required. The simulator runs in demo mode — no login flow exists.

## Demo Mode
All integrations run in demo mode (no real credentials needed to test).
- Banking: Click "Bank Connect" → Select region → Choose bank → Authorize (mock OAuth)
- CSV: Upload any CSV file with date/description/amount columns
- AI: Requires Emergent LLM Key (set in backend/.env as EMERGENT_LLM_KEY)
- Paywall: Click "Unlock Pro - $9.99" → payment is mocked → isPro = true persisted in localStorage

## Optional Production Keys (NOT required for demo)
| Key | Where to get |
|-----|-------------|
| LEAN_APP_TOKEN | https://lean.mx dashboard |
| PLAID_CLIENT_ID + PLAID_SECRET | https://dashboard.plaid.com |
| TRUELAYER_CLIENT_ID + TRUELAYER_CLIENT_SECRET | https://console.truelayer.com |
| EMERGENT_LLM_KEY | Already set in backend/.env (Emergent platform) |
