/**
 * SubScrub Plaid Broker
 *
 * Minimal stateless Express server for Plaid API proxying.
 * This server is the ONLY place that holds Plaid client_secret.
 * The mobile app NEVER sees the secret.
 *
 * Design principles:
 * - Stateless: stores no tokens, no user data, no sessions
 * - Transparent proxy: validates inputs, calls Plaid, returns response
 * - Only required endpoints are exposed
 *
 * Required env vars:
 *   PLAID_CLIENT_ID     - Your Plaid client ID
 *   PLAID_SECRET        - Your Plaid secret (sandbox/development/production)
 *   PLAID_ENV           - sandbox | development | production
 *   PORT                - Server port (default: 3100)
 *   ALLOWED_ORIGIN      - CORS origin for the mobile app (use * for development)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PlaidApi, PlaidEnvironments, Configuration } = require('plaid');

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN ?? '*' }));

// ─── Plaid client ─────────────────────────────────────────────────────────────

const PLAID_ENV = process.env.PLAID_ENV ?? 'sandbox';
const plaidEnvMap = {
  sandbox: PlaidEnvironments.sandbox,
  development: PlaidEnvironments.development,
  production: PlaidEnvironments.production,
};

const configuration = new Configuration({
  basePath: plaidEnvMap[PLAID_ENV] ?? PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: PLAID_ENV, timestamp: new Date().toISOString() });
});

// ─── Create link token ────────────────────────────────────────────────────────

app.post('/api/link-token', async (req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: 'subscrub-user' },
      client_name: 'SubScrub',
      products: ['transactions'],
      country_codes: ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'TR'],
      language: 'en',
    });
    res.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error('[link-token]', err?.response?.data ?? err.message);
    res.status(500).json({ error: 'Failed to create link token' });
  }
});

// ─── Exchange public token ─────────────────────────────────────────────────────

app.post('/api/exchange', async (req, res) => {
  const { public_token } = req.body;
  if (!public_token) {
    return res.status(400).json({ error: 'Missing public_token' });
  }
  try {
    const response = await plaidClient.itemPublicTokenExchange({ public_token });
    // Return access token directly – broker does not store it
    res.json({ access_token: response.data.access_token });
  } catch (err) {
    console.error('[exchange]', err?.response?.data ?? err.message);
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

// ─── Sync transactions ────────────────────────────────────────────────────────

app.post('/api/transactions/sync', async (req, res) => {
  const { access_token, start_date, end_date } = req.body;
  if (!access_token || !start_date || !end_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    let allTransactions = [];
    let cursor = undefined;
    let hasMore = true;

    // Paginate through all transactions
    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token,
        cursor,
        count: 500,
      });
      const data = response.data;
      allTransactions = allTransactions.concat(data.added);
      cursor = data.next_cursor;
      hasMore = data.has_more;
    }

    // Filter by date range
    const filtered = allTransactions.filter((tx) => {
      const txDate = tx.date;
      return txDate >= start_date && txDate <= end_date;
    });

    // Return only what the app needs (no full transaction objects)
    const sanitized = filtered.map((tx) => ({
      transaction_id: tx.transaction_id,
      merchant_name: tx.merchant_name ?? tx.name,
      name: tx.name,
      amount: tx.amount,
      iso_currency_code: tx.iso_currency_code ?? 'USD',
      date: tx.date,
    }));

    res.json({ transactions: sanitized, count: sanitized.length });
  } catch (err) {
    console.error('[transactions/sync]', err?.response?.data ?? err.message);
    res.status(500).json({ error: 'Transaction sync failed' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ?? 3100;
app.listen(PORT, () => {
  console.log(`[SubScrub Plaid Broker] Running on port ${PORT} (${PLAID_ENV})`);
});
