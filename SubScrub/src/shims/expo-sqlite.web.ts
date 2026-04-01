/**
 * Web shim for expo-sqlite.
 * On web, the DB layer initializes but all operations are no-ops.
 * Demo data is loaded directly from JSON files via the store.
 */

const noop = async () => {};
const noopSync = () => {};

const fakeDb = {
  execAsync: noop,
  runAsync: noop,
  getFirstAsync: async () => null,
  getAllAsync: async () => [],
  closeAsync: noop,
  withTransactionAsync: async (fn: () => Promise<void>) => { try { await fn(); } catch {} },
};

export const openDatabaseAsync = async (_name: string) => fakeDb;
export const openDatabaseSync = (_name: string) => ({
  exec: noopSync,
  run: noopSync,
  prepare: () => ({ run: noopSync, get: () => null, all: () => [], free: noopSync }),
  close: noopSync,
});

export const SQLiteProvider = ({ children }: { children: any }) => children;
export const useSQLiteContext = () => fakeDb;
