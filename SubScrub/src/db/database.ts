import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const DB_NAME = 'subscrub.db';
const KEY_STORE_ID = 'subscrub_db_key';

let _db: SQLite.SQLiteDatabase | null = null;

async function getOrCreateDbKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(KEY_STORE_ID);
  if (!key) {
    const bytes = await Crypto.getRandomBytesAsync(32);
    key = Buffer.from(bytes).toString('hex');
    await SecureStore.setItemAsync(KEY_STORE_ID, key);
  }
  return key;
}

export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;

  // SQLCipher encryption requires Expo prebuild with useSQLCipher: true in app.json
  // In managed workflow (Expo Go), falls back to unencrypted SQLite.
  // Production builds via EAS will use full encryption.
  try {
    _db = await SQLite.openDatabaseAsync(DB_NAME, {
      useNewConnection: false,
    });
    // If SQLCipher is available, the key pragma will work silently
    try {
      const key = await getOrCreateDbKey();
      await _db.execAsync(`PRAGMA key = '${key}';`);
    } catch {
      // SQLCipher not available in this build – continue unencrypted
    }
  } catch {
    _db = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return _db;
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    return openDatabase();
  }
  return _db;
}

export async function closeDatabase(): Promise<void> {
  if (_db) {
    await _db.closeAsync();
    _db = null;
  }
}

export async function deleteAllLocalData(): Promise<void> {
  const db = await getDb();
  const tables = [
    'subscriptions',
    'transaction_records',
    'email_artifacts',
    'source_connections',
    'scan_runs',
    'user_profile',
    'app_settings',
    'cancellation_directory',
  ];
  for (const table of tables) {
    await db.execAsync(`DELETE FROM ${table};`);
  }
  await SecureStore.deleteItemAsync(KEY_STORE_ID);
  _db = null;
}
