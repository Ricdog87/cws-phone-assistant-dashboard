import { OUTCOME_LABELS } from './outcomes';
import type { SyncStatus } from './salesforceSync';
import type { CallProtocol, OutcomeType } from './types';

/** Gespräch mit Protokoll, je Firma das jüngste; Grundlage der Wettbewerbsauswertung */
export interface TeamCall {
  id: string;
  leadId: string | null;
  leadName: string;
  city: string;
  /** Branche des Leads, leer wenn unbekannt */
  industry: string;
  hunterName: string;
  assistantName: string;
  recordedAt: string;
  /** null: Protokoll gespeichert, Ergebnis steht noch aus */
  outcome: OutcomeType | null;
  protocol: CallProtocol;
  status: SyncStatus;
  live: boolean;
}

/** Ergebnis in Worten, auch für Gespräche ohne gebuchtes Ergebnis */
export function callOutcomeText(outcome: OutcomeType | null): string {
  return outcome ? OUTCOME_LABELS[outcome] : 'Ergebnis offen';
}

/** Je Firma nur das jüngste Gespräch, neueste oben */
export function latestCallPerCompany(calls: readonly TeamCall[]): TeamCall[] {
  const latest = new Map<string, TeamCall>();
  for (const call of calls) {
    const key = call.leadId ?? call.leadName;
    const current = latest.get(key);
    if (!current || call.recordedAt >= current.recordedAt) latest.set(key, call);
  }
  return [...latest.values()].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}
