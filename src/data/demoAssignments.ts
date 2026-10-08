import type { HunterAssignment } from '@/domain/hunterBoard';
import type { MemberActivity } from '@/domain/standings';
import { DEMO_REGIONS, LIVE_ASSISTANT_ID, type DemoRegion } from './demoTeam';
import { DEMO_HUNTERS } from './hunters';

/**
 * Fiktive Aufteilung der Telefonassistenzen auf die Hunter ihrer Region, abwechselnd
 * in der Reihenfolge des Teams. Die Live-Assistenz arbeitet für den ersten Hunter.
 */
export function demoAssignment(region: DemoRegion): Map<string, string> {
  const hunters = DEMO_HUNTERS.filter((hunter) => hunter.regionId === region.id);
  const assignment = new Map<string, string>();
  region.members.forEach((member, index) => {
    const hunter = member.id === LIVE_ASSISTANT_ID ? hunters[0] : hunters[index % hunters.length];
    if (hunter) assignment.set(member.id, hunter.name);
  });
  return assignment;
}

/** Hunter der Region mit zugeordneten Personen und den Wochenwerten der Demo-Personen */
export function demoHunterAssignments(
  regionId: string,
  members: readonly MemberActivity[],
): HunterAssignment[] {
  const region = DEMO_REGIONS.find((item) => item.id === regionId);
  if (!region) return [];
  const assignment = demoAssignment(region);
  return DEMO_HUNTERS.filter((hunter) => hunter.regionId === region.id).map((hunter) => {
    const assigned = members.filter((member) => assignment.get(member.id) === hunter.name);
    // Live-Werte kommen aus den erfassten Anrufen, nicht aus der Basis
    const baseline = assigned.filter((member) => !member.live && member.id !== LIVE_ASSISTANT_ID);
    return {
      hunter: hunter.name,
      assistants: assigned.map((member) => `${member.givenName} ${member.familyName}`),
      baselineWeekCalls: baseline.reduce((sum, member) => sum + member.weekCalls, 0),
      baselineWeekAppointments: baseline.reduce((sum, member) => sum + member.weekAppointments, 0),
    };
  });
}
