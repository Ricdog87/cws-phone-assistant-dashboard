import { useMemo } from 'react';
import { useGoalProgress } from '@/app/selectors';
import type { GoalProgress } from '@/domain/goals';
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
  states: string;
  standing: TeamStanding;
}

interface LiveActivity {
  dayCalls: number;
  dayAppointments: number;
  weekCalls: number;
  weekAppointments: number;
}

function regionsWithLive(live: LiveActivity): RegionStanding[] {
  return DEMO_REGIONS.map((region) => ({
    id: region.id,
    name: region.name,
    leadName: `${region.leadGivenName} ${region.leadFamilyName}`,
    states: region.states,
    standing: teamStanding(
      applyLiveActivity(region.members, { id: LIVE_ASSISTANT_ID, ...live }),
      region.id,
      region.name,
    ),
  }));
}

function liveActivity(goals: GoalProgress): LiveActivity {
  return {
    dayCalls: goals.day.calls,
    dayAppointments: goals.day.appointments,
    weekCalls: goals.week.calls,
    weekAppointments: goals.week.appointments,
  };
}

/** Region Nord, Martinas Team. Nele Faber folgt den erfassten Anrufen. */
export function useTeamStanding(): TeamStanding {
  const goals = useGoalProgress();
  return useMemo(
    () => regionsWithLive(liveActivity(goals))[0]?.standing ?? teamStanding([], 'nord', 'Nord'),
    [goals],
  );
}

export function useDirectorStanding() {
  const goals = useGoalProgress();
  return useMemo(() => {
    const regions = regionsWithLive(liveActivity(goals));
    return { regions, standing: directorStanding(regions.map((region) => region.standing)) };
  }, [goals]);
}
