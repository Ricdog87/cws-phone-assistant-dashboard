import { useMemo } from 'react';
import { callDay, goalProgress, type CallDay, type GoalProgress } from '@/domain/goals';
import { latestOutcomeByLead } from '@/domain/outcomes';
import { buildQueue, cooldownCount, ownerCounts, type OwnerCount } from '@/domain/queue';
import { scoreLeads } from '@/domain/scoring';
import type { CallOutcome, QueueEntry, ScoredLead } from '@/domain/types';
import { useAppStore } from './store';

/** Alle Leads bewertet, einschließlich Bestandskunden */
export function useScoredLeads(): ScoredLead[] {
  const leads = useAppStore((s) => s.leads);
  const weights = useAppStore((s) => s.weights);
  return useMemo(() => scoreLeads(leads, weights), [leads, weights]);
}

/** Warteschlange der gewählten Potenzialliste, ohne Bestandskunden */
export function useQueue(): QueueEntry[] {
  const scored = useScoredLeads();
  const controlEnabled = useAppStore((s) => s.controlEnabled);
  const ownerFilter = useAppStore((s) => s.ownerFilter);
  const today = todayLocal();
  return useMemo(
    () => buildQueue(scored, controlEnabled, { owner: ownerFilter, today }),
    [scored, controlEnabled, ownerFilter, today],
  );
}

/** Accounts der gewählten Potenzialliste in der Sperrfrist */
export function useCooldownCount(): number {
  const scored = useScoredLeads();
  const ownerFilter = useAppStore((s) => s.ownerFilter);
  const today = todayLocal();
  return useMemo(() => cooldownCount(scored, ownerFilter, today), [scored, ownerFilter, today]);
}

/** Hunter mit Zahl der Neukunden-Accounts für die Auswahl der Potenzialliste */
export function useOwnerCounts(): OwnerCount[] {
  const leads = useAppStore((s) => s.leads);
  return useMemo(() => ownerCounts(leads), [leads]);
}

/** Heutiges Datum in Ortszeit als YYYY-MM-DD */
export function todayLocal(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function useLatestOutcomes(): Map<string, CallOutcome> {
  const outcomes = useAppStore((s) => s.outcomes);
  return useMemo(() => latestOutcomeByLead(outcomes), [outcomes]);
}

/** Tages- und Wochenziel aus den gespeicherten Anrufergebnissen. */
export function useGoalProgress(): GoalProgress {
  const outcomes = useAppStore((s) => s.outcomes);
  return useMemo(() => goalProgress(outcomes), [outcomes]);
}

/** Wochentag und restliche Tage bis Sonntag. Bewusst ohne Memo, damit Mitternacht zählt. */
export function useCallDay(): CallDay {
  return callDay(new Date());
}
