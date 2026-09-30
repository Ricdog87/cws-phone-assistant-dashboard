import { applyControlSample } from './sampling';
import type { QueueEntry, ScoredLead } from './types';

/** Absteigend nach Score, bei Gleichstand bleibt die Eingabereihenfolge erhalten */
export function sortByScore(leads: readonly ScoredLead[]): ScoredLead[] {
  return [...leads].sort((a, b) => b.score - a.score);
}

/**
 * Baut die Warteschlange: nur Leads im Korridor, keine Bestandskunden,
 * sortiert nach Score, optional mit eingestreuter Kontrollstichprobe.
 */
export function buildQueue(scored: readonly ScoredLead[], controlEnabled: boolean): QueueEntry[] {
  const eligible = scored.filter((entry) => entry.inCorridor && !entry.lead.isCustomer);
  return applyControlSample(sortByScore(eligible), { enabled: controlEnabled });
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
