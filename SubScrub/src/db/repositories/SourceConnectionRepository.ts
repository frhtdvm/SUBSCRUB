import { getDb } from '../database';
import type { SourceConnection, SourceType, SourceStatus } from '../../types';

const TABLE = 'source_connections';

function rowToConnection(row: Record<string, unknown>): SourceConnection {
  return {
    id: row.id as string,
    source: row.source as SourceType,
    status: row.status as SourceStatus,
    maskedIdentifier: (row.masked_identifier as string | null) ?? null,
    lastSyncAt: (row.last_sync_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getAllConnections(): Promise<SourceConnection[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${TABLE}`);
  return rows.map(rowToConnection);
}

export async function getConnectionBySource(source: SourceType): Promise<SourceConnection | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM ${TABLE} WHERE source = ?`,
    [source]
  );
  return row ? rowToConnection(row) : null;
}

export async function upsertConnection(connection: SourceConnection): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO ${TABLE} (id, source, status, masked_identifier, last_sync_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      connection.id,
      connection.source,
      connection.status,
      connection.maskedIdentifier,
      connection.lastSyncAt,
      connection.createdAt,
      connection.updatedAt,
    ]
  );
}

export async function updateConnectionStatus(
  source: SourceType,
  status: SourceStatus,
  maskedIdentifier?: string | null
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE ${TABLE} SET status=?, masked_identifier=COALESCE(?, masked_identifier), updated_at=? WHERE source=?`,
    [status, maskedIdentifier ?? null, now, source]
  );
}

export async function deleteConnection(source: SourceType): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM ${TABLE} WHERE source = ?`, [source]);
}
