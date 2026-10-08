import { isInCooldown } from './activity';
import { applyControlSample } from './sampling';
import type { QueueEntry, ScoredLead } from './types';

/** Absteigend nach Score, bei Gleichstand bleibt die Eingabereihenfolge erhalten */
export function sortByScore(leads: readonly ScoredLead[]): ScoredLead[] {
  return [...leads].sort((a, b) => b.score - a.score);
}

export interface QueueFilter {
  /** Accountinhaber, null für alle Hunter */
  owner?: string | null;
  /** Heute als YYYY-MM-DD; gesetzt, blendet die Sperrfrist nach letzter Aktivität aus */
  today?: string | null;
}

/** Neukunden-Accounts der Potenzialliste, ohne Bestandskunden */
export function inList(entry: ScoredLead, owner: string | null | undefined): boolean {
  return (
    !entry.lead.isCustomer && (owner === null || owner === undefined || entry.lead.owner === owner)
  );
}

/**
 * Baut die Warteschlange: keine Bestandskunden, optional nur die Accounts eines
 * Hunters (Accountinhaber), ohne Accounts in der Sperrfrist, sortiert nach Score,
 * optional mit Kontrollstichprobe.
 */
export function buildQueue(
  scored: readonly ScoredLead[],
  controlEnabled: boolean,
  filter: QueueFilter = {},
): QueueEntry[] {
  const { owner = null, today = null } = filter;
  const eligible = scored.filter(
    (entry) => inList(entry, owner) && !(today && isInCooldown(entry.lead.lastActivity, today)),
  );
  return applyControlSample(sortByScore(eligible), { enabled: controlEnabled });
}

/** Accounts der Potenzialliste, die wegen der Sperrfrist gerade nicht in der Warteschlange stehen */
export function cooldownCount(
  scored: readonly ScoredLead[],
  owner: string | null,
  today: string,
): number {
  return scored.filter(
    (entry) => inList(entry, owner) && isInCooldown(entry.lead.lastActivity, today),
  ).length;
}

export interface OwnerCount {
  owner: string;
  count: number;
}

/** Hunter mit der Zahl ihrer offenen Neukunden-Accounts, alphabetisch */
export function ownerCounts(leads: readonly { owner?: string | null; isCustomer: boolean }[]) {
  const counts = new Map<string, number>();
  for (const lead of leads) {
    if (lead.isCustomer || !lead.owner) continue;
    counts.set(lead.owner, (counts.get(lead.owner) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([owner, count]): OwnerCount => ({ owner, count }))
    .sort((a, b) => a.owner.localeCompare(b.owner, 'de'));
}

/** Nächster Lead ohne Ergebnis nach der aktuellen Position, am Ende wird vorne weitergesucht */
export function nextOpenLeadId(
  queue: readonly QueueEntry[],
  currentId: string | null,
  processedIds: ReadonlySet<string>,
): string | null {
  if (queue.length === 0) return null;
  const start = Math.max(
    0,
    queue.findIndex((e) => e.lead.id === currentId),
  );
  for (let step = 1; step <= queue.length; step++) {
    const entry = queue[(start + step) % queue.length];
    if (entry && !processedIds.has(entry.lead.id)) return entry.lead.id;
  }
  return null;
}
