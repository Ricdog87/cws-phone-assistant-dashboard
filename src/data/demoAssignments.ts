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

/** Standardzuordnung aller Regionen, Schlüssel ist die ID der Telefonassistenz */
export function defaultAssignments(): Record<string, string> {
  return Object.fromEntries(DEMO_REGIONS.flatMap((region) => [...demoAssignment(region)]));
}

/**
 * Hunter der Region mit zugeordneten Personen und den Wochenwerten der Demo-Personen.
 * assignments ist die aktuelle Zuordnung, fehlende Personen fallen auf die Standardzuordnung.
 */
export function demoHunterAssignments(
  regionId: string,
  members: readonly MemberActivity[],
  assignments: Readonly<Record<string, string>> = {},
): HunterAssignment[] {
  const region = DEMO_REGIONS.find((item) => item.id === regionId);
  if (!region) return [];
  const fallback = demoAssignment(region);
  const assignment = new Map(
    region.members.map((member) => [
      member.id,
      assignments[member.id] ?? fallback.get(member.id) ?? '',
    ]),
  );
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
