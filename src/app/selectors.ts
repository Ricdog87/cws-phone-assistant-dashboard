import { useMemo } from 'react';
import { latestOutcomeByLead } from '@/domain/outcomes';
import { buildQueue } from '@/domain/queue';
import { scoreLeads } from '@/domain/scoring';
import type { CallOutcome, QueueEntry, ScoredLead } from '@/domain/types';
import { useAppStore } from './store';

/** Alle Leads bewertet, einschließlich Bestandskunden und Leads außerhalb des Korridors */
export function useScoredLeads(): ScoredLead[] {
  const leads = useAppStore((s) => s.leads);
  const route = useAppStore((s) => s.route);
  const weights = useAppStore((s) => s.weights);
  const corridorKm = useAppStore((s) => s.corridorKm);
  return useMemo(
    () => scoreLeads(leads, route, weights, corridorKm),
    [leads, route, weights, corridorKm],
  );
}

export function useQueue(): QueueEntry[] {
  const scored = useScoredLeads();
  const controlEnabled = useAppStore((s) => s.controlEnabled);
  return useMemo(() => buildQueue(scored, controlEnabled), [scored, controlEnabled]);
}

export function useLatestOutcomes(): Map<string, CallOutcome> {
  const outcomes = useAppStore((s) => s.outcomes);
  return useMemo(() => latestOutcomeByLead(outcomes), [outcomes]);
}
