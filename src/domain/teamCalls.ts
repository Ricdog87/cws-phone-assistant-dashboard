import { isNetContact } from './protocol';
import type { SyncStatus } from './salesforceSync';
import type { CallProtocol, CallSolution, OutcomeType } from './types';

/** Gespräch mit Protokoll in der Übersicht der Führung, je Firma das jüngste */
export interface TeamCall {
  id: string;
  leadId: string | null;
  leadName: string;
  city: string;
  hunterName: string;
  assistantName: string;
  recordedAt: string;
  outcome: OutcomeType;
  protocol: CallProtocol;
  status: SyncStatus;
  live: boolean;
}

/** Auswahl „Aktuelle Lösung“ im Filter; open heißt nicht erfasst */
export type SolutionFilter = CallSolution | 'all' | 'open';

export interface CallFilter {
  solution: SolutionFilter;
  /** Anbieter, nur bei Wettbewerb; all zeigt alle */
  competitor: string;
}

export const ALL_CALLS: CallFilter = { solution: 'all', competitor: 'all' };

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

export function filterCalls(calls: readonly TeamCall[], filter: CallFilter): TeamCall[] {
  return calls.filter((call) => {
    const solution = call.protocol.solution;
    if (filter.solution === 'open' && solution !== null) return false;
    if (filter.solution !== 'all' && filter.solution !== 'open' && solution !== filter.solution) {
      return false;
    }
    if (filter.solution === 'competitor' && filter.competitor !== 'all') {
      return call.protocol.competitor === filter.competitor;
    }
    return true;
  });
}

export interface CallSummary {
  companies: number;
  netContacts: number;
  competitor: number;
  /** Anbieter mit Zahl der Firmen, häufigste zuerst */
  byCompetitor: { name: string; count: number }[];
}

export function summarizeCalls(calls: readonly TeamCall[]): CallSummary {
  const competitors = new Map<string, number>();
  for (const call of calls) {
    if (call.protocol.solution !== 'competitor') continue;
    const name = call.protocol.competitor ?? 'Unbekannt';
    competitors.set(name, (competitors.get(name) ?? 0) + 1);
  }
  return {
    companies: calls.length,
    netContacts: calls.filter((call) => isNetContact(call.protocol)).length,
    competitor: calls.filter((call) => call.protocol.solution === 'competitor').length,
    byCompetitor: [...competitors.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'de')),
  };
}
