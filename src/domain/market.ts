import { CALL_SOLUTIONS, CALL_SOLUTION_LABELS, COMPETITORS, isNetContact } from './protocol';
import { contractFollowUpDate } from './recall';
import type { TeamCall } from './teamCalls';
import type { CallSolution } from './types';

/**
 * Wettbewerbsauswertung: aktuelle Lösung je Firma aus dem jüngsten Gespräch, bei Wettbewerb
 * mit Vertragsende und dem Termin, ab dem nachgefasst wird (neun Monate vorher).
 */

/**
 * Wann bei einer Firma beim Wettbewerb nachgefasst wird. Erledigt sind Firmen mit
 * vereinbartem Termin oder mit Sperre (Nicht mehr anrufen, Firma erloschen).
 */
export type FollowUpBucket = 'now' | 'next3' | 'next12' | 'later' | 'unknown' | 'settled';

export const FOLLOW_UP_BUCKETS: readonly FollowUpBucket[] = [
  'now',
  'next3',
  'next12',
  'later',
  'unknown',
  'settled',
];

export const FOLLOW_UP_LABELS: Record<FollowUpBucket, string> = {
  now: 'Jetzt nachfassen',
  next3: 'In den nächsten 3 Monaten',
  next12: 'In 3 bis 12 Monaten',
  later: 'Später',
  unknown: 'Vertragsende unbekannt',
  settled: 'Erledigt: Termin oder Sperre',
};

/** Grund, warum bei einer Firma gerade niemand nachfassen muss; null, wenn offen */
export function settledReason(call: TeamCall): string | null {
  if (call.outcome === 'appointment') return 'Termin vereinbart';
  if (call.protocol.doNotCall) return 'Nicht mehr anrufen';
  if (call.protocol.companyDissolved) return 'Firma erloschen';
  return null;
}

export interface MarketRow extends TeamCall {
  regionId: string;
  /** Nachfassen ab, YYYY-MM-DD; nur bei Wettbewerb mit bekanntem Vertragsende */
  followUp: string | null;
  /** null, wenn die Firma nicht beim Wettbewerb ist */
  bucket: FollowUpBucket | null;
}

function isoDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addMonths(day: string, months: number): string {
  const [year = 1970, month = 1, date = 1] = day.split('-').map(Number);
  return isoDay(new Date(year, month - 1 + months, date));
}

/** Einordnung des Nachfass-Termins relativ zu heute (YYYY-MM-DD) */
export function followUpBucket(followUp: string | null, today: string): FollowUpBucket {
  if (!followUp) return 'unknown';
  if (followUp <= today) return 'now';
  if (followUp <= addMonths(today, 3)) return 'next3';
  if (followUp <= addMonths(today, 12)) return 'next12';
  return 'later';
}

export function toMarketRow(call: TeamCall, regionId: string, today: string): MarketRow {
  const competitor = call.protocol.solution === 'competitor';
  const contractEnd = call.protocol.contractEnd ?? null;
  const followUp = competitor && contractEnd ? contractFollowUpDate(contractEnd) : null;
  return {
    ...call,
    regionId,
    followUp,
    bucket: !competitor ? null : settledReason(call) ? 'settled' : followUpBucket(followUp, today),
  };
}

/** Auswahl Lösung: alle, nicht erfasst, eine Lösung, Wettbewerb gesamt oder ein Anbieter */
export type SolutionChoice = 'all' | 'open' | CallSolution | `competitor:${string}`;

const COMPETITOR_PREFIX = 'competitor:';

export function competitorChoice(name: string): SolutionChoice {
  return `${COMPETITOR_PREFIX}${name}`;
}

export function solutionChoiceLabel(choice: SolutionChoice): string {
  if (choice === 'all') return 'Alle Lösungen';
  if (choice === 'open') return 'Nicht erfasst';
  if (choice === 'competitor') return 'Wettbewerb gesamt';
  if (choice.startsWith(COMPETITOR_PREFIX)) return choice.slice(COMPETITOR_PREFIX.length);
  return CALL_SOLUTION_LABELS[choice as CallSolution];
}

function competitorName(row: TeamCall): string {
  return row.protocol.competitor ?? 'Unbekannt';
}

export function matchesSolution(row: TeamCall, choice: SolutionChoice): boolean {
  const solution = row.protocol.solution;
  if (choice === 'all') return true;
  if (choice === 'open') return solution === null;
  if (choice.startsWith(COMPETITOR_PREFIX)) {
    return (
      solution === 'competitor' && competitorName(row) === choice.slice(COMPETITOR_PREFIX.length)
    );
  }
  return solution === choice;
}

export interface MarketFilter {
  /** Region, all für alle */
  regionId: string;
  hunter: string;
  industry: string;
  solution: SolutionChoice;
  followUp: FollowUpBucket | 'all';
}

export const ALL_MARKET: MarketFilter = {
  regionId: 'all',
  hunter: 'all',
  industry: 'all',
  solution: 'all',
  followUp: 'all',
};

/**
 * Zeilen der Auswahl. ignore lässt einzelne Filter aus, damit eine Grafik alle Werte ihrer
 * eigenen Dimension zeigt, etwa alle Wettbewerber, obwohl einer gewählt ist.
 */
export function filterMarket(
  rows: readonly MarketRow[],
  filter: MarketFilter,
  ignore: readonly (keyof MarketFilter)[] = [],
): MarketRow[] {
  const use = (key: keyof MarketFilter) => !ignore.includes(key) && filter[key] !== 'all';
  return rows.filter(
    (row) =>
      (!use('regionId') || row.regionId === filter.regionId) &&
      (!use('hunter') || row.hunterName === filter.hunter) &&
      (!use('industry') || (row.industry || 'Branche unbekannt') === filter.industry) &&
      (!use('solution') || matchesSolution(row, filter.solution)) &&
      (!use('followUp') || row.bucket === filter.followUp),
  );
}

export function isFiltered(filter: MarketFilter, ignore: readonly (keyof MarketFilter)[] = []) {
  return (Object.keys(filter) as (keyof MarketFilter)[]).some(
    (key) => !ignore.includes(key) && filter[key] !== 'all',
  );
}

export interface MarketSummary {
  companies: number;
  netContacts: number;
  competitor: number;
  followUpNow: number;
  contractUnknown: number;
}

export function summarizeMarket(rows: readonly MarketRow[]): MarketSummary {
  return {
    companies: rows.length,
    netContacts: rows.filter((row) => isNetContact(row.protocol)).length,
    competitor: rows.filter((row) => row.bucket !== null).length,
    followUpNow: rows.filter((row) => row.bucket === 'now').length,
    contractUnknown: rows.filter((row) => row.bucket === 'unknown').length,
  };
}

export interface SolutionSlice {
  choice: SolutionChoice;
  label: string;
  count: number;
  competitor: boolean;
}

/**
 * Firmen je Wettbewerber in fester Reihenfolge, dann die übrigen Lösungen; „Nicht erfasst“
 * nur, wenn vorhanden. Feste Reihenfolge, damit Balken beim Filtern nicht springen.
 */
export function solutionBreakdown(rows: readonly MarketRow[]): SolutionSlice[] {
  const competitors = COMPETITORS.map((name) => ({
    choice: competitorChoice(name),
    label: name,
    count: rows.filter((row) => row.bucket !== null && competitorName(row) === name).length,
    competitor: true,
  }));
  const others = CALL_SOLUTIONS.filter((solution) => solution !== 'competitor').map((solution) => ({
    choice: solution as SolutionChoice,
    label: CALL_SOLUTION_LABELS[solution],
    count: rows.filter((row) => row.protocol.solution === solution).length,
    competitor: false,
  }));
  const open = rows.filter((row) => row.protocol.solution === null).length;
  return [
    ...competitors,
    ...others,
    ...(open > 0
      ? [{ choice: 'open' as const, label: 'Nicht erfasst', count: open, competitor: false }]
      : []),
  ];
}

export interface QuarterBar {
  key: string;
  label: string;
  /** Verträge, bei denen das Nachfassen schon möglich ist */
  now: number;
  later: number;
}

function quarterIndex(month: string): number | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  return Number(match[1]) * 4 + Math.floor((Number(match[2]) - 1) / 3);
}

/**
 * Offene Vertragsenden beim Wettbewerb je Quartal ab dem laufenden, dazu „später“ und bereits
 * beendete Verträge; ohne erledigte Firmen. Jeder Balken teilt sich in „jetzt nachfassen“
 * und „später“.
 */
export function contractEndsByQuarter(
  rows: readonly MarketRow[],
  today: string,
  quarters = 8,
): QuarterBar[] {
  const current = quarterIndex(today.slice(0, 7)) ?? 0;
  const bars: QuarterBar[] = Array.from({ length: quarters }, (_, offset) => {
    const index = current + offset;
    const year = Math.floor(index / 4);
    const quarter = (index % 4) + 1;
    return { key: `${year}-Q${quarter}`, label: `Q${quarter} ${year}`, now: 0, later: 0 };
  });
  const expired: QuarterBar = { key: 'expired', label: 'Beendet', now: 0, later: 0 };
  const beyond: QuarterBar = { key: 'beyond', label: 'Später', now: 0, later: 0 };
  for (const row of rows) {
    if (
      row.bucket === null ||
      row.bucket === 'unknown' ||
      row.bucket === 'settled' ||
      !row.protocol.contractEnd
    ) {
      continue;
    }
    const index = quarterIndex(row.protocol.contractEnd);
    if (index === null) continue;
    const bar =
      index < current ? expired : index - current >= quarters ? beyond : bars[index - current];
    if (!bar) continue;
    if (row.bucket === 'now') bar.now += 1;
    else bar.later += 1;
  }
  return [
    ...(expired.now + expired.later > 0 ? [expired] : []),
    ...bars,
    ...(beyond.now + beyond.later > 0 ? [beyond] : []),
  ];
}

export interface IndustryRow {
  industry: string;
  companies: number;
  competitor: number;
  byCompetitor: Record<string, number>;
}

/** Branchen mit Firmen je Wettbewerber, die mit den meisten Wettbewerbskunden zuerst */
export function industryMatrix(rows: readonly MarketRow[]): IndustryRow[] {
  const byIndustry = new Map<string, IndustryRow>();
  for (const row of rows) {
    const industry = row.industry || 'Branche unbekannt';
    const entry = byIndustry.get(industry) ?? {
      industry,
      companies: 0,
      competitor: 0,
      byCompetitor: Object.fromEntries(COMPETITORS.map((name) => [name, 0])),
    };
    entry.companies += 1;
    if (row.bucket !== null) {
      entry.competitor += 1;
      const name = competitorName(row);
      entry.byCompetitor[name] = (entry.byCompetitor[name] ?? 0) + 1;
    }
    byIndustry.set(industry, entry);
  }
  return [...byIndustry.values()].sort(
    (a, b) =>
      b.competitor - a.competitor ||
      b.companies - a.companies ||
      a.industry.localeCompare(b.industry, 'de'),
  );
}

const BUCKET_ORDER: Record<FollowUpBucket, number> = {
  now: 0,
  next3: 1,
  next12: 2,
  later: 3,
  unknown: 4,
  settled: 5,
};

/**
 * Reihenfolge der Nachfass-Liste: fällige Wettbewerbskunden zuerst, nach Nachfass-Termin;
 * dann unbekanntes Vertragsende, dann erledigte; dann die übrigen Firmen, jüngstes Gespräch
 * zuerst.
 */
export function sortForFollowUp(rows: readonly MarketRow[]): MarketRow[] {
  const rank = (row: MarketRow) => (row.bucket === null ? 6 : BUCKET_ORDER[row.bucket]);
  return [...rows].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a.followUp ?? '').localeCompare(b.followUp ?? '') ||
      b.recordedAt.localeCompare(a.recordedAt) ||
      a.leadName.localeCompare(b.leadName, 'de'),
  );
}

/** Auswahlwerte mit Anzahl, häufigste zuerst */
export function countBy(
  rows: readonly MarketRow[],
  key: (row: MarketRow) => string,
): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(key(row), (counts.get(key(row)) ?? 0) + 1);
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'de'));
}
