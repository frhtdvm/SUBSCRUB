import { getDb } from './database';

export const SCHEMA_VERSION = 1;

export async function initSchema(): Promise<void> {
  const db = await getDb();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY NOT NULL,
      is_premium INTEGER NOT NULL DEFAULT 0,
      last_scan_date TEXT,
      total_saved REAL NOT NULL DEFAULT 0,
      preferred_currency TEXT,
      jurisdiction TEXT NOT NULL DEFAULT 'GENERIC',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY NOT NULL,
      is_demo_mode INTEGER NOT NULL DEFAULT 1,
      onboarding_complete INTEGER NOT NULL DEFAULT 0,
      has_seeded_directory INTEGER NOT NULL DEFAULT 0,
      preferred_currency TEXT NOT NULL DEFAULT 'USD',
      jurisdiction TEXT NOT NULL DEFAULT 'GENERIC',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS source_connections (
      id TEXT PRIMARY KEY NOT NULL,
      source TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'disconnected',
      masked_identifier TEXT,
      last_sync_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transaction_records (
      id TEXT PRIMARY KEY NOT NULL,
      source_connection_id TEXT NOT NULL,
      provider_hint TEXT,
      merchant_name_raw TEXT,
      merchant_name_normalized TEXT,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      transaction_date TEXT NOT NULL,
      fingerprint TEXT NOT NULL,
      raw_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS email_artifacts (
      id TEXT PRIMARY KEY NOT NULL,
      source_connection_id TEXT NOT NULL,
      provider_hint TEXT,
      sender TEXT NOT NULL,
      subject TEXT NOT NULL,
      snippet TEXT,
      received_at TEXT NOT NULL,
      fingerprint TEXT NOT NULL,
      raw_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY NOT NULL,
      provider_name TEXT NOT NULL,
      normalized_provider TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      frequency TEXT NOT NULL,
      next_billing_date TEXT,
      category TEXT NOT NULL DEFAULT 'other',
      cancellation_link TEXT,
      support_email TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      confidence_score REAL NOT NULL DEFAULT 0,
      detection_source TEXT NOT NULL DEFAULT 'plaid',
      last_charge_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scan_runs (
      id TEXT PRIMARY KEY NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      sources TEXT NOT NULL DEFAULT '[]',
      transactions_processed INTEGER NOT NULL DEFAULT 0,
      emails_processed INTEGER NOT NULL DEFAULT 0,
      subscriptions_found INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS cancellation_directory (
      id TEXT PRIMARY KEY NOT NULL,
      provider_name TEXT NOT NULL,
      aliases TEXT NOT NULL DEFAULT '[]',
      sender_domains TEXT NOT NULL DEFAULT '[]',
      merchant_aliases TEXT NOT NULL DEFAULT '[]',
      category TEXT NOT NULL DEFAULT 'other',
      cancellation_link TEXT,
      support_email TEXT,
      region TEXT NOT NULL DEFAULT 'global',
      requires_login INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_normalized ON transaction_records(merchant_name_normalized);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transaction_records(transaction_date);
    CREATE INDEX IF NOT EXISTS idx_transactions_source ON transaction_records(source_connection_id);
    CREATE INDEX IF NOT EXISTS idx_emails_provider ON email_artifacts(provider_hint);
    CREATE INDEX IF NOT EXISTS idx_emails_received ON email_artifacts(received_at);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON subscriptions(normalized_provider);
    CREATE INDEX IF NOT EXISTS idx_directory_provider ON cancellation_directory(provider_name);
  `);
}
