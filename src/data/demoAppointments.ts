import type { TeamAppointment } from '@/domain/appointments';
import type { MemberActivity } from '@/domain/standings';
import { demoAssignment } from './demoAssignments';
import { withDemoOwnership } from './demoOwnership';
import { DEMO_REGIONS, LIVE_ASSISTANT_ID } from './demoTeam';
import { MOCK_LEADS } from './mockLeads';
import { MOCK_LEADS_NORDWEST } from './mockLeadsNordwest';

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Werktag n Tage nach heute um eine volle oder halbe Stunde zwischen 8 und 15:30 Uhr */
function demoStart(today: Date, seed: number): string {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let workdays = 1 + (seed % 8);
  while (workdays > 0) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) workdays--;
  }
  const slot = Math.floor(seed / 8) % 16;
  date.setHours(8 + Math.floor(slot / 2), slot % 2 === 0 ? 0 : 30);
  return date.toISOString();
}

/**
 * Fiktive Termine der Demo-Personen einer Region: so viele, wie sie diese Woche
 * vereinbart haben, bei Firmen ihres Hunters. Etwa jeder vierte ist noch unbestätigt.
 */
export function demoTeamAppointments(
  regionId: string,
  members: readonly MemberActivity[],
  assignments: Readonly<Record<string, string>> = {},
  today: Date = new Date(),
): TeamAppointment[] {
  const region = DEMO_REGIONS.find((item) => item.id === regionId);
  if (!region) return [];
  const fallback = demoAssignment(region);
  const isoDay = today.toISOString().slice(0, 10);
  const leads = withDemoOwnership([...MOCK_LEADS, ...MOCK_LEADS_NORDWEST], isoDay).filter(
    (lead) => !lead.isCustomer,
  );
  const rows: TeamAppointment[] = [];
  for (const member of members) {
    if (member.live || member.id === LIVE_ASSISTANT_ID) continue;
    const hunter = assignments[member.id] ?? fallback.get(member.id);
    const pool = leads.filter((lead) => lead.owner === hunter);
    for (let i = 0; i < member.weekAppointments && pool.length > 0; i++) {
      const seed = hash(`${member.id}-${i}`);
      const lead = pool[seed % pool.length];
      if (!lead || !hunter) continue;
      rows.push({
        id: `demo-${member.id}-${i}`,
        leadId: null,
        leadName: lead.name,
        start: demoStart(today, seed),
        hunterName: hunter,
        assistantName: `${member.givenName} ${member.familyName}`,
        status: seed % 4 === 0 ? 'open' : 'confirmed',
        live: false,
      });
    }
  }
  return rows;
}
