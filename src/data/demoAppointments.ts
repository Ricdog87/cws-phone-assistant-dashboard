import type { TeamAppointment } from '@/domain/appointments';
import type { MemberActivity } from '@/domain/standings';
import type { Lead } from '@/domain/types';
import { demoAssignment } from './demoAssignments';
import { demoPastWeek } from './demoHistory';
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

/** Buchungszeitpunkt in dieser Woche zwischen Montag und heute, Arbeitszeit 8 bis 16 Uhr */
function demoBookedAt(today: Date, seed: number): string {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekday = date.getDay() === 0 ? 7 : date.getDay();
  date.setDate(date.getDate() - (seed % weekday));
  date.setHours(8 + (Math.floor(seed / 8) % 8), (seed >>> 4) % 60);
  // Nie in der Zukunft: heute gebuchte Termine liegen vor dem aktuellen Zeitpunkt
  if (date.getTime() > today.getTime()) {
    return new Date(today.getTime() - ((seed >>> 8) % 120) * 60_000).toISOString();
  }
  return date.toISOString();
}

/**
 * Fiktive Termine der Demo-Personen einer Region: so viele, wie sie diese Woche
 * vereinbart haben, bei Firmen ihres Hunters, je Firma höchstens einer. Firmen mit Termin
 * oder Wiedervorlage der Live-Assistenz bleiben frei. Etwa jeder vierte ist noch nicht in
 * Salesforce eingetragen.
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
    for (const row of demoEarlierAppointments(leads, liveHunter, '', today)) {
      const lead = leads.find((item) => item.name === row.leadName);
      if (lead) used.add(lead.id);
    }
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
        bookedAt: demoBookedAt(today, seed),
        hunterName: hunter,
        assistantName: `${member.givenName} ${member.familyName}`,
        status: seed % 4 === 0 ? 'open' : 'entered',
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

/**
 * Fiktive Termine der Live-Assistenz aus den Vorwochen, so viele wie ihr Werdegang zeigt,
 * je Firma höchstens einer und nie bei Firmen mit offener Demo-Wiedervorlage. Alle sind in
 * Salesforce eingetragen; die laufende Woche kommt aus den erfassten Anrufen.
 */
export function demoEarlierAppointments(
  leads: readonly Lead[],
  owner: string,
  assistantName: string,
  today: Date = new Date(),
  weeks = 2,
): TeamAppointment[] {
  const recallLeads = new Set(demoRecalls(leads, owner, today).map((recall) => recall.leadId));
  const pool = leads
    .filter((lead) => !lead.isCustomer && lead.owner === owner && !recallLeads.has(lead.id))
    .sort((a, b) => hash(`termin-${a.id}`) - hash(`termin-${b.id}`));
  const member = {
    id: LIVE_ASSISTANT_ID,
    givenName: '',
    familyName: '',
    dayCalls: 0,
    weekCalls: 0,
    weekAppointments: 0,
    live: true,
  };
  const weekday = today.getDay() === 0 ? 7 : today.getDay();
  const rows: TeamAppointment[] = [];
  for (let back = 1; back <= weeks; back++) {
    const { appointments } = demoPastWeek(member, today, back);
    const monday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - (weekday - 1) - back * 7,
    );
    for (let i = 0; i < appointments; i++) {
      const lead = pool[rows.length];
      if (!lead) return rows;
      const seed = hash(`${LIVE_ASSISTANT_ID}-${back}-${i}`);
      const booked = new Date(monday);
      booked.setDate(monday.getDate() + (seed % 5));
      booked.setHours(8 + (Math.floor(seed / 8) % 8), (seed >>> 4) % 60);
      rows.push({
        id: `demo-${LIVE_ASSISTANT_ID}-${back}-${i}`,
        leadId: null,
        leadName: lead.name,
        bookedAt: booked.toISOString(),
        hunterName: owner,
        assistantName,
        status: 'entered',
        live: false,
      });
    }
  }
  return rows;
}
