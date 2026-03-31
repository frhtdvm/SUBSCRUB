import { getDb } from '../database';
import type { EmailArtifact } from '../../types';

const TABLE = 'email_artifacts';

function rowToEmail(row: Record<string, unknown>): EmailArtifact {
  return {
    id: row.id as string,
    sourceConnectionId: row.source_connection_id as string,
    providerHint: (row.provider_hint as string | null) ?? null,
    sender: row.sender as string,
    subject: row.subject as string,
    snippet: (row.snippet as string | null) ?? null,
    receivedAt: row.received_at as string,
    fingerprint: row.fingerprint as string,
    rawHash: row.raw_hash as string,
    createdAt: row.created_at as string,
  };
}

export async function insertEmails(emails: EmailArtifact[]): Promise<void> {
  const db = await getDb();
  for (const email of emails) {
    await db.runAsync(
      `INSERT OR IGNORE INTO ${TABLE} (id, source_connection_id, provider_hint, sender, subject, snippet, received_at, fingerprint, raw_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        email.id, email.sourceConnectionId, email.providerHint, email.sender,
        email.subject, email.snippet, email.receivedAt, email.fingerprint,
        email.rawHash, email.createdAt,
      ]
    );
  }
}

export async function getAllEmails(): Promise<EmailArtifact[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM ${TABLE} ORDER BY received_at DESC`
  );
  return rows.map(rowToEmail);
}

export async function getEmailsInRange(
  startDate: string,
  endDate: string
): Promise<EmailArtifact[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM ${TABLE} WHERE received_at >= ? AND received_at <= ? ORDER BY received_at DESC`,
    [startDate, endDate]
  );
  return rows.map(rowToEmail);
}

export async function getEmailCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM ${TABLE}`
  );
  return row?.cnt ?? 0;
}
