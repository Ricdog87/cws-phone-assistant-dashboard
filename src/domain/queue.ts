import { applyControlSample } from './sampling';
import type { QueueEntry, ScoredLead } from './types';

/** Absteigend nach Score, bei Gleichstand bleibt die Eingabereihenfolge erhalten */
export function sortByScore(leads: readonly ScoredLead[]): ScoredLead[] {
  return [...leads].sort((a, b) => b.score - a.score);
}

/**
 * Baut die Warteschlange: keine Bestandskunden, optional nur die Accounts eines
 * Hunters (Accountinhaber), sortiert nach Score, optional mit Kontrollstichprobe.
 */
export function buildQueue(
  scored: readonly ScoredLead[],
  controlEnabled: boolean,
  owner: string | null = null,
): QueueEntry[] {
  const eligible = scored.filter(
    (entry) => !entry.lead.isCustomer && (owner === null || entry.lead.owner === owner),
  );
  return applyControlSample(sortByScore(eligible), { enabled: controlEnabled });
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
