import type { QueueEntry, ScoredLead } from './types';

/** Anteil der Warteschlange, der als Kontrollstichprobe aus Band B und C gezogen wird */
export const CONTROL_SHARE = 0.08;
/** Fester Seed, damit die Auswahl reproduzierbar bleibt */
export const CONTROL_SEED = 20240611;

export interface ControlSampleOptions {
  enabled: boolean;
  share?: number;
  seed?: number;
}

/** Deterministischer Zufallsgenerator (mulberry32), liefert Werte in [0, 1) */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates mit festem Seed, verändert die Eingabe nicht */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  const random = createRandom(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = result[i] as T;
    result[i] = result[j] as T;
    result[j] = a;
  }
  return result;
}

/** Anzahl der Kontroll-Leads für eine Warteschlange der Länge n */
export function controlCount(queueLength: number, share: number = CONTROL_SHARE): number {
  return Math.round(queueLength * share);
}

/** Gleichmäßig verteilte Positionen (0-basiert) für k Einträge in einer Liste der Länge n */
export function evenPositions(n: number, k: number): number[] {
  if (k <= 0 || n <= 0) return [];
  return Array.from({ length: k }, (_, j) => Math.floor(((j + 0.5) * n) / k));
}

/**
 * Zieht die Kontrollstichprobe aus den Bändern B und C und streut sie gleichmäßig
 * in die nach Score sortierte Warteschlange ein. Die Ziehung hängt nur vom Seed und
 * von der Menge der Kandidaten ab, nicht von deren Reihenfolge.
 */
export function applyControlSample(
  sortedQueue: readonly ScoredLead[],
  options: ControlSampleOptions,
): QueueEntry[] {
  const share = options.share ?? CONTROL_SHARE;
  const seed = options.seed ?? CONTROL_SEED;
  const n = sortedQueue.length;

  const plain = (): QueueEntry[] =>
    sortedQueue.map((entry, i) => ({ ...entry, isControl: false, position: i + 1 }));

  if (!options.enabled || n === 0) return plain();

  const candidates = sortedQueue
    .filter((entry) => entry.band === 'B' || entry.band === 'C')
    .sort((a, b) => (a.lead.id < b.lead.id ? -1 : a.lead.id > b.lead.id ? 1 : 0));
  const k = Math.min(controlCount(n, share), candidates.length);
  if (k === 0) return plain();

  const controlIds = new Set(
    seededShuffle(candidates, seed)
      .slice(0, k)
      .map((e) => e.lead.id),
  );
  const control = sortedQueue.filter((entry) => controlIds.has(entry.lead.id));
  const regular = sortedQueue.filter((entry) => !controlIds.has(entry.lead.id));
  const slots = new Set(evenPositions(n, k));

  const result: QueueEntry[] = [];
  let c = 0;
  let r = 0;
  for (let i = 0; i < n; i++) {
    const takeControl = slots.has(i) && c < control.length;
    const source = takeControl ? control[c++] : regular[r++];
    if (!source) continue;
    result.push({ ...source, isControl: takeControl, position: result.length + 1 });
  }
  return result;
}
