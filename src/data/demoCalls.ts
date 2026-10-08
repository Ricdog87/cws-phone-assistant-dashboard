import type { TeamCall } from '@/domain/teamCalls';
import type { MemberActivity } from '@/domain/standings';
import type { CallProtocol, Lead, OutcomeType } from '@/domain/types';
import { demoTeamAppointments } from './demoAppointments';
import { demoAssignment } from './demoAssignments';
import { withDemoOwnership } from './demoOwnership';
import { demoRecalls } from './demoRecalls';
import { DEMO_REGIONS, LIVE_ASSISTANT_ID } from './demoTeam';
import { DEMO_HUNTERS } from './hunters';
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

/** Anteil der Firmen einer Region mit Gespräch in den letzten Wochen, in Prozent */
const CALLED_SHARE = 45;

/** Notizen bei Wettbewerb; closed passt nur zu „Kein Interesse“ */
const COMPETITOR_NOTES: { text: (name: string) => string; closed: boolean }[] = [
  { text: (name) => `Vertrag bei ${name} läuft noch rund ein Jahr`, closed: false },
  { text: (name) => `Unzufrieden mit der Liefertreue von ${name}`, closed: false },
  { text: (name) => `Preisvergleich zu ${name} gewünscht`, closed: false },
  { text: (name) => `Zufrieden mit ${name}, Vertrag frisch verlängert`, closed: true },
  { text: (name) => `Rahmenvertrag mit ${name} über die Zentrale`, closed: true },
];

const NOTES: Record<Exclude<CallProtocol['solution'], 'competitor' | null>, string[]> = {
  companyBuys: [
    'Kauft über den Fachhandel, wäscht selbst',
    'Kauf über Online-Shop, Pflege ist ein Thema',
    'Kauft jährlich neu, Wäsche über Dienstleister vor Ort',
  ],
  employeesBuy: [
    'Kleidergeld für die Mitarbeitenden, kein einheitlicher Auftritt',
    'Mitarbeitende kaufen selbst, Logo auf der Kleidung gewünscht',
  ],
  none: ['Bisher keine Berufskleidung, Interesse an einheitlichem Auftritt'],
};

function competitorOf(key: string): string {
  const share = hash(`anbieter-${key}`) % 100;
  if (share < 35) return 'MEWA';
  if (share < 60) return 'DBL';
  if (share < 80) return 'Bardusch';
  if (share < 95) return 'Alsco';
  return 'Sonstiger';
}

/**
 * Erfundenes Protokoll, Verteilung als Annahme für die Demo. Jedes Merkmal hat einen eigenen
 * Streuwert, damit sie nicht zusammenhängen.
 */
function demoProtocol(key: string, outcome: OutcomeType, forceCompetitor = false): CallProtocol {
  const share = (name: string) => hash(`${name}-${key}`) % 100;
  const roleShare = share('rolle') % 10;
  const solutionShare = share('loesung');
  const solution: CallProtocol['solution'] =
    forceCompetitor || solutionShare < 45
      ? 'competitor'
      : solutionShare < 70
        ? 'companyBuys'
        : solutionShare < 85
          ? 'employeesBuy'
          : solutionShare < 95
            ? 'none'
            : null;
  const competitor = solution === 'competitor' ? competitorOf(key) : null;
  const centralDecision = share('zentrale') < 8;
  const notes =
    solution === 'competitor'
      ? COMPETITOR_NOTES.filter((note) => outcome === 'not_interested' || !note.closed).map(
          (note) => note.text(competitor ?? 'Wettbewerb'),
        )
      : solution === 'none' && outcome === 'not_interested'
        ? ['Keine Berufskleidung, aktuell kein Bedarf']
        : solution
          ? NOTES[solution]
          : ['Ansprechpartner nur kurz erreicht'];
  const note = notes[share('notiz') % notes.length] ?? null;
  return {
    contactRole:
      outcome === 'appointment' || roleShare < 7
        ? 'decisionMaker'
        : roleShare < 9
          ? 'gatekeeper'
          : 'other',
    solution,
    competitor,
    companyDissolved: false,
    centralDecision,
    existingCustomer: share('bestand') < 2,
    doNotCall: outcome === 'not_interested' && share('sperre') < 6,
    note: centralDecision && note ? `${note}; Entscheidung über die Zentrale` : note,
  };
}

/** Werktag days Tage vor heute, zwischen 8 und 16 Uhr; ein Wochenende rückt auf Freitag */
function earlierWorkday(today: Date, days: number, seed: number): string {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days);
  while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() - 1);
  date.setHours(8 + (seed % 8), (seed >>> 6) % 60);
  return date.toISOString();
}

function call(
  lead: Lead,
  assistantName: string,
  hunterName: string,
  recordedAt: string,
  outcome: OutcomeType,
  protocol: CallProtocol,
): TeamCall {
  return {
    id: `demo-gespraech-${lead.id}`,
    leadId: null,
    leadName: lead.name,
    city: lead.city,
    hunterName,
    assistantName,
    recordedAt,
    outcome,
    protocol,
    status: 'demo',
    live: false,
  };
}

/**
 * Fiktive Gespräche mit Protokoll in einer Region, je Firma eines: die Termine dieser Woche,
 * die Wiedervorlagen der Live-Assistenz und weitere Gespräche der letzten Wochen.
 */
export function demoTeamCalls(
  regionId: string,
  members: readonly MemberActivity[],
  assignments: Readonly<Record<string, string>> = {},
  today: Date = new Date(),
): TeamCall[] {
  const region = DEMO_REGIONS.find((item) => item.id === regionId);
  if (!region) return [];
  const isoDay = today.toISOString().slice(0, 10);
  const leads = withDemoOwnership([...MOCK_LEADS, ...MOCK_LEADS_NORDWEST], isoDay).filter(
    (lead) => !lead.isCustomer,
  );
  const byName = new Map(leads.map((lead) => [lead.name, lead]));
  const fallback = demoAssignment(region);
  const hunterOf = (memberId: string) => assignments[memberId] ?? fallback.get(memberId);
  const calls: TeamCall[] = [];
  const used = new Set<string>();

  for (const row of demoTeamAppointments(regionId, members, assignments, today)) {
    const lead = byName.get(row.leadName);
    if (!lead) continue;
    used.add(lead.id);
    calls.push(
      call(lead, row.assistantName, row.hunterName, row.bookedAt, 'appointment', {
        ...demoProtocol(lead.id, 'appointment'),
        doNotCall: false,
      }),
    );
  }

  const live = region.members.find((member) => member.id === LIVE_ASSISTANT_ID);
  const liveHunter = live ? hunterOf(live.id) : undefined;
  if (live && liveHunter) {
    const liveName = `${live.givenName} ${live.familyName}`;
    for (const recall of demoRecalls(leads, liveHunter, today)) {
      const lead = leads.find((item) => item.id === recall.leadId);
      if (!lead || used.has(lead.id)) continue;
      used.add(lead.id);
      calls.push(
        call(lead, liveName, liveHunter, recall.createdAt, 'callback', {
          ...demoProtocol(lead.id, 'callback', recall.reason === 'contractEnd'),
          note: recall.note,
        }),
      );
    }
  }

  const assistantsByHunter = new Map<string, string[]>();
  for (const member of members) {
    if (member.id === LIVE_ASSISTANT_ID) continue;
    const hunter = hunterOf(member.id);
    if (!hunter) continue;
    assistantsByHunter.set(hunter, [
      ...(assistantsByHunter.get(hunter) ?? []),
      `${member.givenName} ${member.familyName}`,
    ]);
  }
  const regionHunters = new Set(
    DEMO_HUNTERS.filter((hunter) => hunter.regionId === regionId).map((hunter) => hunter.name),
  );
  for (const lead of leads) {
    if (!lead.owner || !regionHunters.has(lead.owner) || used.has(lead.id)) continue;
    const seed = hash(`gespraech-${lead.id}`);
    if (seed % 100 >= CALLED_SHARE) continue;
    const pool = assistantsByHunter.get(lead.owner) ?? [];
    const assistant = pool[(seed >>> 3) % Math.max(1, pool.length)];
    if (!assistant) continue;
    const recordedAt = earlierWorkday(today, 1 + ((seed >>> 7) % 20), seed);
    // Selten: Rufnummer tot, Firma erloschen
    if (hash(`erloschen-${lead.id}`) % 100 < 2) {
      calls.push(
        call(lead, assistant, lead.owner, recordedAt, 'not_reached', {
          contactRole: null,
          solution: null,
          competitor: null,
          companyDissolved: true,
          centralDecision: false,
          existingCustomer: false,
          doNotCall: true,
          note: 'Rufnummer abgeschaltet, Firma laut Handelsregister erloschen',
        }),
      );
      continue;
    }
    const outcome: OutcomeType =
      hash(`ergebnis-${lead.id}`) % 100 < 52 ? 'callback' : 'not_interested';
    calls.push(
      call(lead, assistant, lead.owner, recordedAt, outcome, demoProtocol(lead.id, outcome)),
    );
  }
  return calls;
}
