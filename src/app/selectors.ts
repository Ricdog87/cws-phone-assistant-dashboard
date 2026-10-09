import { useMemo } from 'react';
import { callDay, goalProgress, type CallDay, type GoalProgress } from '@/domain/goals';
import { latestOutcomeByLead } from '@/domain/outcomes';
import { buildQueue, cooldownCount, ownerCounts, type OwnerCount } from '@/domain/queue';
import { scoreLeads } from '@/domain/scoring';
import type { SyncStatus } from '@/domain/salesforceSync';
import type { CallOutcome, QueueEntry, ScoredLead } from '@/domain/types';
import { useAppStore } from './store';

/** Alle Leads bewertet, einschließlich Bestandskunden */
export function useScoredLeads(): ScoredLead[] {
  const leads = useAppStore((s) => s.leads);
  const weights = useAppStore((s) => s.weights);
  return useMemo(() => scoreLeads(leads, weights), [leads, weights]);
}

/** Bewertete Leads der gewählten Branche, alle ohne Branchenfilter */
function useIndustryLeads(): ScoredLead[] {
  const scored = useScoredLeads();
  const industryFilter = useAppStore((s) => s.industryFilter);
  return useMemo(
    () =>
      industryFilter
        ? scored.filter((entry) => (entry.lead.industry || UNKNOWN_INDUSTRY) === industryFilter)
        : scored,
    [scored, industryFilter],
  );
}

/** Warteschlange der gewählten Potenzialliste und Branche, ohne Bestandskunden */
export function useQueue(): QueueEntry[] {
  const scored = useIndustryLeads();
  const controlEnabled = useAppStore((s) => s.controlEnabled);
  const ownerFilter = useAppStore((s) => s.ownerFilter);
  const today = todayLocal();
  return useMemo(
    () => buildQueue(scored, controlEnabled, { owner: ownerFilter, today }),
    [scored, controlEnabled, ownerFilter, today],
  );
}

/** Accounts der gewählten Potenzialliste und Branche in der Sperrfrist */
export function useCooldownCount(): number {
  const scored = useIndustryLeads();
  const ownerFilter = useAppStore((s) => s.ownerFilter);
  const today = todayLocal();
  return useMemo(() => cooldownCount(scored, ownerFilter, today), [scored, ownerFilter, today]);
}

/** Anzeige für Leads ohne Branche */
export const UNKNOWN_INDUSTRY = 'Branche unbekannt';

/** Branchen der gewählten Potenzialliste mit Zahl der Neukunden-Accounts, häufigste zuerst */
export function useIndustryCounts(): { industry: string; count: number }[] {
  const leads = useAppStore((s) => s.leads);
  const ownerFilter = useAppStore((s) => s.ownerFilter);
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const lead of leads) {
      if (lead.isCustomer || (ownerFilter && lead.owner !== ownerFilter)) continue;
      const industry = lead.industry || UNKNOWN_INDUSTRY;
      counts.set(industry, (counts.get(industry) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count || a.industry.localeCompare(b.industry, 'de'));
  }, [leads, ownerFilter]);
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

/**
 * Status der Übertragung nach Salesforce je Ergebnis- oder Wiedervorlage-ID. Demo-Einträge
 * ohne eigenen Postausgang gelten mit Demo-Daten als simuliert übertragen.
 */
export function useSyncStatus(): (id: string) => SyncStatus {
  const syncItems = useAppStore((s) => s.syncItems);
  const sourceId = useAppStore((s) => s.sourceId);
  return useMemo(() => {
    const byId = new Map(syncItems.map((item) => [item.id, item.status]));
    return (id: string) => byId.get(id) ?? (sourceId === 'mock' ? 'demo' : 'pending');
  }, [syncItems, sourceId]);
}
