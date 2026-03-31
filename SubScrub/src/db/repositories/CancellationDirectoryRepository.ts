import { getDb } from '../database';
import type { CancellationDirectoryEntry, SubscriptionCategory } from '../../types';

const TABLE = 'cancellation_directory';

function rowToEntry(row: Record<string, unknown>): CancellationDirectoryEntry {
  let aliases: string[] = [];
  let senderDomains: string[] = [];
  let merchantAliases: string[] = [];
  try { aliases = JSON.parse(row.aliases as string); } catch { aliases = []; }
  try { senderDomains = JSON.parse(row.sender_domains as string); } catch { senderDomains = []; }
  try { merchantAliases = JSON.parse(row.merchant_aliases as string); } catch { merchantAliases = []; }
  return {
    id: row.id as string,
    providerName: row.provider_name as string,
    aliases,
    senderDomains,
    merchantAliases,
    category: row.category as SubscriptionCategory,
    cancellationLink: (row.cancellation_link as string | null) ?? null,
    supportEmail: (row.support_email as string | null) ?? null,
    region: (row.region as CancellationDirectoryEntry['region']) ?? 'global',
    requiresLogin: (row.requires_login as number) === 1,
  };
}

export async function seedDirectory(entries: CancellationDirectoryEntry[]): Promise<void> {
  const db = await getDb();
  for (const entry of entries) {
    await db.runAsync(
      `INSERT OR IGNORE INTO ${TABLE} (id, provider_name, aliases, sender_domains, merchant_aliases, category, cancellation_link, support_email, region, requires_login)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id, entry.providerName,
        JSON.stringify(entry.aliases),
        JSON.stringify(entry.senderDomains),
        JSON.stringify(entry.merchantAliases),
        entry.category,
        entry.cancellationLink,
        entry.supportEmail,
        entry.region,
        entry.requiresLogin ? 1 : 0,
      ]
    );
  }
}

export async function getAllDirectoryEntries(): Promise<CancellationDirectoryEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${TABLE}`);
  return rows.map(rowToEntry);
}

export async function findByMerchantName(
  normalizedName: string
): Promise<CancellationDirectoryEntry | null> {
  const all = await getAllDirectoryEntries();
  const lower = normalizedName.toLowerCase();
  return (
    all.find((e) => {
      const allAliases = [
        ...e.merchantAliases.map((a) => a.toLowerCase()),
        ...e.aliases.map((a) => a.toLowerCase()),
        e.providerName.toLowerCase(),
        e.id.toLowerCase(),
      ];
      return allAliases.some(
        (a) => a.replace(/\*/g, '').includes(lower) || lower.includes(a.replace(/\*/g, ''))
      );
    }) ?? null
  );
}

export async function findBySenderDomain(
  domain: string
): Promise<CancellationDirectoryEntry | null> {
  const all = await getAllDirectoryEntries();
  return (
    all.find((e) => e.senderDomains.some((d) => domain.includes(d) || d.includes(domain))) ?? null
  );
}

export async function getDirectoryCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM ${TABLE}`);
  return row?.cnt ?? 0;
}
