import { useMemo } from 'react';
import { useLatestOutcomes, useOwnerCounts, useScoredLeads } from '@/app/selectors';
import { useAppStore } from '@/app/store';
import { demoHunterAssignments } from '@/data/demoAssignments';
import { demoTeamAppointments } from '@/data/demoAppointments';
import { DEMO_REGIONS, LIVE_ASSISTANT_ID } from '@/data/demoTeam';
import {
  liveTeamAppointments,
  sortTeamAppointments,
  type TeamAppointment,
} from '@/domain/appointments';
import { hunterRows, type HunterAssignment, type HunterRow } from '@/domain/hunterBoard';
import type { MemberStanding } from '@/domain/standings';

export interface RegionBoard {
  hunters: HunterRow[];
  appointments: TeamAppointment[];
}

/** Termine aus diesem Browser, einschließlich gebuchter Termine ohne Details */
export function useLiveAppointments(): TeamAppointment[] {
  const appointments = useAppStore((s) => s.appointments);
  const agentName = useAppStore((s) => s.agentName);
  const latest = useLatestOutcomes();
  return useMemo(() => {
    const booked = [...latest.values()]
      .filter((outcome) => outcome.outcome === 'appointment')
      .map((outcome) => ({
        id: outcome.id,
        leadId: outcome.leadId,
        leadName: outcome.leadName,
        owner: outcome.owner ?? null,
      }));
    return sortTeamAppointments(liveTeamAppointments(appointments, booked, agentName));
  }, [appointments, latest, agentName]);
}

/**
 * Potenzialliste je Hunter und Terminbestätigungen einer Region. Mit Demo-Daten
 * kommen fiktive Kolleginnen und Kollegen dazu, mit importierten Daten nur die
 * echten Accountinhaber und die Termine aus diesem Browser.
 */
export function useRegionBoard(regionId: string, members: readonly MemberStanding[]): RegionBoard {
  const scored = useScoredLeads();
  const outcomes = useAppStore((s) => s.outcomes);
  const sourceId = useAppStore((s) => s.sourceId);
  const owners = useOwnerCounts();
  const live = useLiveAppointments();
  const demo = sourceId === 'mock';
  const hasLiveMember = DEMO_REGIONS.find((region) => region.id === regionId)?.members.some(
    (member) => member.id === LIVE_ASSISTANT_ID,
  );

  return useMemo(() => {
    const assignments: HunterAssignment[] = demo
      ? demoHunterAssignments(regionId, members)
      : owners.map((item) => ({
          hunter: item.owner,
          assistants: [],
          baselineWeekCalls: 0,
          baselineWeekAppointments: 0,
        }));
    const appointments = [
      ...(hasLiveMember ? live : []),
      ...(demo ? demoTeamAppointments(regionId, members) : []),
    ];
    return {
      hunters: hunterRows(assignments, scored, outcomes),
      appointments: sortTeamAppointments(appointments),
    };
  }, [demo, regionId, members, owners, live, hasLiveMember, scored, outcomes]);
}
