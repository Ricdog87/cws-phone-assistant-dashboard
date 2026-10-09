import { useMemo } from 'react';
import { todayLocal, useSyncStatus } from '@/app/selectors';
import { useAppStore } from '@/app/store';
import { demoTeamCalls } from '@/data/demoCalls';
import { DEMO_REGIONS, LIVE_ASSISTANT_ID } from '@/data/demoTeam';
import { toMarketRow, type MarketRow } from '@/domain/market';
import { hasProtocolInfo } from '@/domain/protocol';
import { latestCallPerCompany, type TeamCall } from '@/domain/teamCalls';
import { useDirectorStanding } from '@/features/dashboard/useTeamStanding';

/** Region der angemeldeten Telefonassistenz; dorthin gehören die Gespräche aus diesem Browser */
export const LIVE_REGION_ID =
  DEMO_REGIONS.find((region) => region.members.some((member) => member.id === LIVE_ASSISTANT_ID))
    ?.id ?? 'nord';

/** Region der Teamleitung in der Demo */
export const TEAM_LEAD_REGION_ID = DEMO_REGIONS[0]?.id ?? LIVE_REGION_ID;

/** Gespräche mit Protokoll aus diesem Browser, gespeicherte ohne Ergebnis eingeschlossen */
export function useLiveCalls(): TeamCall[] {
  const outcomes = useAppStore((s) => s.outcomes);
  const openCalls = useAppStore((s) => s.openCalls);
  const leads = useAppStore((s) => s.leads);
  const agentName = useAppStore((s) => s.agentName);
  const syncStatus = useSyncStatus();
  return useMemo(() => {
    const leadById = new Map(leads.map((lead) => [lead.id, lead]));
    const sources = [
      ...outcomes,
      ...openCalls.map((call) => ({ ...call, outcome: null, recordedAt: call.savedAt })),
    ];
    return sources.flatMap((source) => {
      if (!hasProtocolInfo(source.protocol)) return [];
      const lead = leadById.get(source.leadId);
      return [
        {
          id: source.id,
          leadId: source.leadId,
          leadName: source.leadName,
          city: lead?.city ?? '',
          industry: lead?.industry ?? '',
          hunterName: source.owner ?? 'nicht zugeordnet',
          assistantName: agentName,
          recordedAt: source.recordedAt,
          outcome: source.outcome,
          protocol: source.protocol,
          status: syncStatus(source.id),
          live: true,
        },
      ];
    });
  }, [outcomes, openCalls, leads, agentName, syncStatus]);
}

/**
 * Alle Gespräche mit Protokoll, je Firma das jüngste, mit Region: aus diesem Browser und,
 * mit Demo-Daten, die fiktiven Gespräche der Kolleginnen und Kollegen.
 */
export function useAllCalls(): MarketRow[] {
  const { regions } = useDirectorStanding();
  const assignments = useAppStore((s) => s.assignments);
  const demo = useAppStore((s) => s.sourceId) === 'mock';
  const live = useLiveCalls();
  const today = todayLocal();
  const demoCalls = useMemo(
    () =>
      demo
        ? regions.flatMap((region) =>
            demoTeamCalls(region.id, region.standing.members, assignments).map((call) => ({
              call,
              regionId: region.id,
            })),
          )
        : [],
    [demo, regions, assignments],
  );
  return useMemo(() => {
    const tagged = [...demoCalls, ...live.map((call) => ({ call, regionId: LIVE_REGION_ID }))];
    const regionOf = new Map(tagged.map(({ call, regionId }) => [call.id, regionId]));
    return latestCallPerCompany(tagged.map(({ call }) => call)).map((call) =>
      toMarketRow(call, regionOf.get(call.id) ?? LIVE_REGION_ID, today),
    );
  }, [demoCalls, live, today]);
}

/**
 * Gespräche im Blick der Rolle: die Telefonassistenz sieht die Leadliste ihres Hunters, die
 * Teamleitung ihre Region, die Vertriebsleitung alle Regionen.
 */
export function useMarketRows(): MarketRow[] {
  const rows = useAllCalls();
  const viewLevel = useAppStore((s) => s.viewLevel);
  const ownerFilter = useAppStore((s) => s.ownerFilter);
  return useMemo(() => {
    if (viewLevel === 'director') return rows;
    if (viewLevel === 'teamLead') return rows.filter((row) => row.regionId === TEAM_LEAD_REGION_ID);
    return rows.filter(
      (row) => row.regionId === LIVE_REGION_ID && (!ownerFilter || row.hunterName === ownerFilter),
    );
  }, [rows, viewLevel, ownerFilter]);
}

/** Jüngstes bekanntes Gespräch je Lead, für den bekannten Stand in der Anrufliste */
export function useKnownCalls(): Map<string, MarketRow> {
  const rows = useAllCalls();
  return useMemo(
    () =>
      new Map(
        rows.flatMap((row) => (row.leadId ? [[row.leadId, row] as [string, MarketRow]] : [])),
      ),
    [rows],
  );
}
