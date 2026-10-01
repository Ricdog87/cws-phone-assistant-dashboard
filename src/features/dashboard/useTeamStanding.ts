import { useMemo } from 'react';
import { useGoalProgress } from '@/app/selectors';
import { DEMO_REGIONS, LIVE_ASSISTANT_ID } from '@/data/demoTeam';
import {
  applyLiveActivity,
  directorStanding,
  teamStanding,
  type TeamStanding,
} from '@/domain/standings';

export interface RegionStanding {
  id: string;
  name: string;
  leadName: string;
  standing: TeamStanding;
}

function regionsWithLive(
  dayCalls: number,
  weekCalls: number,
  weekAppointments: number,
): RegionStanding[] {
  return DEMO_REGIONS.map((region) => ({
    id: region.id,
    name: region.name,
    leadName: `${region.leadGivenName} ${region.leadFamilyName}`,
    standing: teamStanding(
      applyLiveActivity(region.members, {
        id: LIVE_ASSISTANT_ID,
        dayCalls,
        weekCalls,
        weekAppointments,
      }),
      region.id,
      region.name,
    ),
  }));
}

/** Region Nord, Martinas Team. Nele Faber folgt den erfassten Anrufen. */
export function useTeamStanding(): TeamStanding {
  const goals = useGoalProgress();
  return useMemo(
    () =>
      regionsWithLive(goals.day.calls, goals.week.calls, goals.week.appointments)[0]?.standing ??
      teamStanding([], 'nord', 'Nord'),
    [goals],
  );
}

export function useDirectorStanding() {
  const goals = useGoalProgress();
  return useMemo(() => {
    const regions = regionsWithLive(goals.day.calls, goals.week.calls, goals.week.appointments);
    return { regions, standing: directorStanding(regions.map((region) => region.standing)) };
  }, [goals]);
}
