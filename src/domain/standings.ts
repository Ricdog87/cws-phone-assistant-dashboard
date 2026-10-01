import { DAILY_CALL_GOAL, WEEKLY_APPOINTMENT_GOAL } from './goals';

/** Erfasste Anrufe und Termine einer Person. Die Ziele kommen aus den bestehenden Konstanten. */
export interface MemberActivity {
  id: string;
  givenName: string;
  familyName: string;
  dayCalls: number;
  weekCalls: number;
  weekAppointments: number;
  /** True, wenn die Zahlen aus erfassten Anrufen dieser Sitzung stammen. */
  live: boolean;
}

export interface MemberStanding extends MemberActivity {
  fullName: string;
  dailyCallGoal: number;
  weeklyAppointmentGoal: number;
  dayCallsRemaining: number;
  appointmentsRemaining: number;
}

export interface TeamStanding {
  teamId: string;
  teamName: string;
  members: MemberStanding[];
  headcount: number;
  dayCalls: number;
  weekCalls: number;
  weekAppointments: number;
  dailyCallGoal: number;
  weeklyAppointmentGoal: number;
  /** Termine je 100 Anrufe in der Woche. */
  appointmentsPer100: number;
  atWeeklyGoal: number;
  underDailyGoal: number;
}

export interface DirectorStanding {
  teams: TeamStanding[];
  teamCount: number;
  headcount: number;
  dayCalls: number;
  weekCalls: number;
  weekAppointments: number;
  dailyCallGoal: number;
  weeklyAppointmentGoal: number;
  appointmentsPer100: number;
  atWeeklyGoal: number;
  underDailyGoal: number;
}

export function applyLiveActivity(
  members: readonly MemberActivity[],
  live: Pick<MemberActivity, 'id' | 'dayCalls' | 'weekCalls' | 'weekAppointments'>,
): MemberActivity[] {
  return members.map((member) =>
    member.id === live.id
      ? {
          ...member,
          dayCalls: live.dayCalls,
          weekCalls: live.weekCalls,
          weekAppointments: live.weekAppointments,
          live: true,
        }
      : member,
  );
}

function per100(appointments: number, calls: number): number {
  return calls === 0 ? 0 : (appointments / calls) * 100;
}

function toMemberStanding(member: MemberActivity): MemberStanding {
  return {
    ...member,
    fullName: `${member.givenName} ${member.familyName}`,
    dailyCallGoal: DAILY_CALL_GOAL,
    weeklyAppointmentGoal: WEEKLY_APPOINTMENT_GOAL,
    dayCallsRemaining: Math.max(0, DAILY_CALL_GOAL - member.dayCalls),
    appointmentsRemaining: Math.max(0, WEEKLY_APPOINTMENT_GOAL - member.weekAppointments),
  };
}

/** Personen nach Terminen, dann Anrufen, dann Name. */
export function teamStanding(
  members: readonly MemberActivity[],
  teamId: string,
  teamName: string,
): TeamStanding {
  const ranked = members.map(toMemberStanding).sort((a, b) => {
    if (b.weekAppointments !== a.weekAppointments) return b.weekAppointments - a.weekAppointments;
    if (b.dayCalls !== a.dayCalls) return b.dayCalls - a.dayCalls;
    return a.fullName.localeCompare(b.fullName, 'de');
  });
  const dayCalls = ranked.reduce((sum, member) => sum + member.dayCalls, 0);
  const weekCalls = ranked.reduce((sum, member) => sum + member.weekCalls, 0);
  const weekAppointments = ranked.reduce((sum, member) => sum + member.weekAppointments, 0);
  return {
    teamId,
    teamName,
    members: ranked,
    headcount: ranked.length,
    dayCalls,
    weekCalls,
    weekAppointments,
    dailyCallGoal: ranked.length * DAILY_CALL_GOAL,
    weeklyAppointmentGoal: ranked.length * WEEKLY_APPOINTMENT_GOAL,
    appointmentsPer100: per100(weekAppointments, weekCalls),
    atWeeklyGoal: ranked.filter((member) => member.weekAppointments >= WEEKLY_APPOINTMENT_GOAL)
      .length,
    underDailyGoal: ranked.filter((member) => member.dayCalls < DAILY_CALL_GOAL).length,
  };
}

/** Verdichtet mehrere Teams. Die Zeilen bleiben je Team, damit weitere Länder dazukommen. */
export function directorStanding(teams: readonly TeamStanding[]): DirectorStanding {
  const dayCalls = teams.reduce((sum, team) => sum + team.dayCalls, 0);
  const weekCalls = teams.reduce((sum, team) => sum + team.weekCalls, 0);
  const weekAppointments = teams.reduce((sum, team) => sum + team.weekAppointments, 0);
  const headcount = teams.reduce((sum, team) => sum + team.headcount, 0);
  return {
    teams: [...teams],
    teamCount: teams.length,
    headcount,
    dayCalls,
    weekCalls,
    weekAppointments,
    dailyCallGoal: teams.reduce((sum, team) => sum + team.dailyCallGoal, 0),
    weeklyAppointmentGoal: teams.reduce((sum, team) => sum + team.weeklyAppointmentGoal, 0),
    appointmentsPer100: per100(weekAppointments, weekCalls),
    atWeeklyGoal: teams.reduce((sum, team) => sum + team.atWeeklyGoal, 0),
    underDailyGoal: teams.reduce((sum, team) => sum + team.underDailyGoal, 0),
  };
}
