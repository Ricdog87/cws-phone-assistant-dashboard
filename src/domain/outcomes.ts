import type { Band, CallOutcome, OutcomeType } from './types';

export const OUTCOME_TYPES: readonly OutcomeType[] = [
  'appointment',
  'callback',
  'not_reached',
  'not_interested',
];

export const OUTCOME_LABELS: Record<OutcomeType, string> = {
  appointment: 'Termin vereinbart',
  callback: 'Wiedervorlage',
  not_reached: 'Nicht erreicht',
  not_interested: 'Kein Interesse',
};

export interface RateStats {
  calls: number;
  appointments: number;
  /** Termine je 100 Anrufe */
  per100: number;
}

export interface DashboardMetrics {
  total: RateStats;
  byBand: Record<Band, RateStats>;
  control: RateStats;
  regular: RateStats;
}

export function rateStats(outcomes: readonly CallOutcome[]): RateStats {
  const calls = outcomes.length;
  const appointments = outcomes.filter((o) => o.outcome === 'appointment').length;
  return { calls, appointments, per100: calls === 0 ? 0 : (appointments / calls) * 100 };
}

export function computeMetrics(outcomes: readonly CallOutcome[]): DashboardMetrics {
  return {
    total: rateStats(outcomes),
    byBand: {
      A: rateStats(outcomes.filter((o) => o.band === 'A')),
      B: rateStats(outcomes.filter((o) => o.band === 'B')),
      C: rateStats(outcomes.filter((o) => o.band === 'C')),
    },
    control: rateStats(outcomes.filter((o) => o.isControl)),
    regular: rateStats(outcomes.filter((o) => !o.isControl)),
  };
}

/** Letztes Ergebnis je Lead */
export function latestOutcomeByLead(outcomes: readonly CallOutcome[]): Map<string, CallOutcome> {
  const map = new Map<string, CallOutcome>();
  for (const o of outcomes) {
    const existing = map.get(o.leadId);
    if (!existing || existing.recordedAt <= o.recordedAt) map.set(o.leadId, o);
  }
  return map;
}
