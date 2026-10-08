import type { TeamAppointment } from '@/domain/appointments';
import type { MemberActivity } from '@/domain/standings';
import type { Lead } from '@/domain/types';
import { demoAssignment } from './demoAssignments';
import { demoRecalls } from './demoRecalls';
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

/**
 * Buchungszeitpunkt: heute zwischen 8 Uhr und jetzt, sonst an einem früheren Werktag dieser
 * Woche zwischen 8 und 16 Uhr. Am Montag liegen alle Termine auf heute.
 */
function demoBookedAt(now: Date, seed: number, onToday: boolean): string {
  const weekday = now.getDay() === 0 ? 7 : now.getDay();
  if (onToday || weekday === 1) {
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const start = midnight + 8 * 60 * 60_000;
    // Vor 8 Uhr liegen die Buchungen kurz vor jetzt, nie vor Mitternacht
    if (now.getTime() <= start) {
      return new Date(Math.max(midnight, now.getTime() - ((seed % 50) + 5) * 60_000)).toISOString();
    }
    const span = Math.max(1, Math.floor((now.getTime() - start) / 60_000));
    return new Date(start + (seed % span) * 60_000).toISOString();
  }
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  date.setDate(date.getDate() - (1 + (seed % (weekday - 1))));
  date.setHours(8 + (Math.floor(seed / 8) % 8), (seed >>> 4) % 60);
  return date.toISOString();
}

/**
 * Fiktive Termine der Demo-Personen einer Region: so viele, wie sie diese Woche
 * vereinbart haben, bei Firmen ihres Hunters, je Firma höchstens einer. Firmen mit
 * Wiedervorlage der Live-Assistenz bleiben frei. Davon heute so viele, wie die Person heute
 * vereinbart hat.
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
  const used = new Set<string>();
  const liveHunter = assignments[LIVE_ASSISTANT_ID] ?? fallback.get(LIVE_ASSISTANT_ID);
  if (liveHunter) {
    for (const recall of demoRecalls(leads, liveHunter, today)) used.add(recall.leadId);
  }
  const rows: TeamAppointment[] = [];
  for (const member of members) {
    if (member.live || member.id === LIVE_ASSISTANT_ID) continue;
    const hunter = assignments[member.id] ?? fallback.get(member.id);
    const pool = leads.filter((lead) => lead.owner === hunter);
    for (let i = 0; i < member.weekAppointments && pool.length > 0; i++) {
      const seed = hash(`${member.id}-${i}`);
      const lead = firstUnused(pool, seed % pool.length, used);
      if (!lead || !hunter) continue;
      used.add(lead.id);
      rows.push({
        id: `demo-${member.id}-${i}`,
        leadId: null,
        leadName: lead.name,
        bookedAt: demoBookedAt(today, seed, i < member.dayAppointments),
        hunterName: hunter,
        assistantName: `${member.givenName} ${member.familyName}`,
        status: 'demo',
        live: false,
      });
    }
  }
  return rows;
}

/** Nächster freier Lead ab start, ringsum; undefined, wenn alle vergeben sind */
function firstUnused(
  pool: readonly Lead[],
  start: number,
  used: ReadonlySet<string>,
): Lead | undefined {
  for (let step = 0; step < pool.length; step++) {
    const lead = pool[(start + step) % pool.length];
    if (lead && !used.has(lead.id)) return lead;
  }
  return undefined;
}
