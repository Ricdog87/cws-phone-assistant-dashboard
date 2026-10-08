import { useMemo } from 'react';
import { useLatestOutcomes, useOwnerCounts, useScoredLeads, useSyncStatus } from '@/app/selectors';
import { useAppStore } from '@/app/store';
import { demoHunterAssignments } from '@/data/demoAssignments';
import { demoTeamAppointments } from '@/data/demoAppointments';
import { demoTeamCalls } from '@/data/demoCalls';
import { DEMO_REGIONS, LIVE_ASSISTANT_ID } from '@/data/demoTeam';
import { DEMO_HUNTERS } from '@/data/hunters';
import {
  liveTeamAppointments,
  sortTeamAppointments,
  type TeamAppointment,
} from '@/domain/appointments';
import { hunterRows, type HunterAssignment, type HunterRow } from '@/domain/hunterBoard';
import { hasProtocolInfo } from '@/domain/protocol';
import type { MemberStanding } from '@/domain/standings';
import { latestCallPerCompany, type TeamCall } from '@/domain/teamCalls';

export interface RegionBoard {
  hunters: HunterRow[];
  appointments: TeamAppointment[];
  /** Gespräche mit Protokoll, je Firma das jüngste */
  calls: TeamCall[];
}

/** Gebuchte Termine aus diesem Browser mit dem Status ihres Anrufprotokolls in Salesforce */
export function useLiveAppointments(): TeamAppointment[] {
  const agentName = useAppStore((s) => s.agentName);
  const latest = useLatestOutcomes();
  const syncStatus = useSyncStatus();
  return useMemo(() => {
    const booked = [...latest.values()]
      .filter((outcome) => outcome.outcome === 'appointment')
      .map((outcome) => ({
        id: outcome.id,
        leadId: outcome.leadId,
        leadName: outcome.leadName,
        owner: outcome.owner ?? null,
        recordedAt: outcome.recordedAt,
      }));
    const status = new Map(booked.map((entry) => [entry.id, syncStatus(entry.id)]));
    return sortTeamAppointments(liveTeamAppointments(booked, status, agentName));
  }, [latest, agentName, syncStatus]);
}

/** Gespräche mit Protokoll aus diesem Browser */
export function useLiveCalls(): TeamCall[] {
  const outcomes = useAppStore((s) => s.outcomes);
  const leads = useAppStore((s) => s.leads);
  const agentName = useAppStore((s) => s.agentName);
  const syncStatus = useSyncStatus();
  return useMemo(() => {
    const cityOf = new Map(leads.map((lead) => [lead.id, lead.city]));
    return outcomes.flatMap((outcome) =>
      hasProtocolInfo(outcome.protocol)
        ? [
            {
              id: outcome.id,
              leadId: outcome.leadId,
              leadName: outcome.leadName,
              city: cityOf.get(outcome.leadId) ?? '',
              hunterName: outcome.owner ?? 'nicht zugeordnet',
              assistantName: agentName,
              recordedAt: outcome.recordedAt,
              outcome: outcome.outcome,
              protocol: outcome.protocol,
              status: syncStatus(outcome.id),
              live: true,
            },
          ]
        : [],
    );
  }, [outcomes, leads, agentName, syncStatus]);
}

/**
 * Potenzialliste je Hunter, Termine und Gespräche einer Region. Mit Demo-Daten kommen
 * fiktive Kolleginnen und Kollegen dazu, mit importierten Daten nur die echten
 * Accountinhaber und die Einträge aus diesem Browser.
 */
export function useRegionBoard(regionId: string, members: readonly MemberStanding[]): RegionBoard {
  const scored = useScoredLeads();
  const outcomes = useAppStore((s) => s.outcomes);
  const sourceId = useAppStore((s) => s.sourceId);
  const owners = useOwnerCounts();
  const assignmentMap = useAppStore((s) => s.assignments);
  const live = useLiveAppointments();
  const liveCalls = useLiveCalls();
  const demo = sourceId === 'mock';
  const hasLiveMember = DEMO_REGIONS.find((region) => region.id === regionId)?.members.some(
    (member) => member.id === LIVE_ASSISTANT_ID,
  );

  return useMemo(() => {
    const assignments: HunterAssignment[] = demo
      ? demoHunterAssignments(regionId, members, assignmentMap)
      : owners.map((item) => ({
          hunter: item.owner,
          assistants: [],
          baselineWeekCalls: 0,
          baselineWeekAppointments: 0,
        }));
    const appointments = [
      ...(hasLiveMember ? live : []),
      ...(demo ? demoTeamAppointments(regionId, members, assignmentMap) : []),
    ];
    const calls = latestCallPerCompany([
      ...(hasLiveMember ? liveCalls : []),
      ...(demo ? demoTeamCalls(regionId, members, assignmentMap) : []),
    ]);
    return {
      hunters: hunterRows(assignments, scored, outcomes),
      appointments: sortTeamAppointments(appointments),
      calls,
    };
  }, [
    demo,
    regionId,
    members,
    owners,
    assignmentMap,
    live,
    liveCalls,
    hasLiveMember,
    scored,
    outcomes,
  ]);
}

export interface HunterOption {
  name: string;
  area: string | null;
}

/** Hunter, denen in dieser Region zugeordnet werden kann: Demo-Hunter oder echte Accountinhaber */
export function useHunterOptions(regionId: string): HunterOption[] {
  const sourceId = useAppStore((s) => s.sourceId);
  const owners = useOwnerCounts();
  return useMemo(
    () =>
      sourceId === 'mock'
        ? DEMO_HUNTERS.filter((hunter) => hunter.regionId === regionId).map((hunter) => ({
            name: hunter.name,
            area: hunter.area,
          }))
        : owners.map((item) => ({ name: item.owner, area: null })),
    [sourceId, owners, regionId],
  );
}
