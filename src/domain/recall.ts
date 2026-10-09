import { BOOKING_LEAD_DAYS_MIN } from './routingConfig';
import { CONTRACT_RECALL_MONTHS_BEFORE } from './qualificationConfig';
import type { CallOutcome, Recall, RecallReason } from './types';

export const RECALL_REASON_LABELS: Record<RecallReason, string> = {
  callback: 'Rückruf vereinbart',
  contractEnd: 'Vertragsende',
};

/**
 * Ab wann bei einem Vertrag beim Wettbewerb nachgefasst wird: erster Werktag des Monats,
 * neun Monate vor Vertragsende (YYYY-MM). null bei ungültiger Angabe.
 */
export function contractFollowUpDate(contractEnd: string): string | null {
  const match = /^(\d{4})-(\d{2})$/.exec(contractEnd);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!year || month < 1 || month > 12) return null;
  return formatIsoDate(nextWeekday(new Date(year, month - 1 - CONTRACT_RECALL_MONTHS_BEFORE, 1)));
}

/** Erster des Monats, neun Monate vor Vertragsende, sonst der nächste Werktag. */
export function suggestRecallDate(contractEnd: string, today: Date): string | 'bookNow' {
  const recall = contractFollowUpDate(contractEnd);
  if (!recall) return 'bookNow';
  const earliest = formatIsoDate(addBusinessDays(startOfDay(today), BOOKING_LEAD_DAYS_MIN));
  return recall < earliest ? 'bookNow' : recall;
}

/** Werktag nach heute, Vorschlag für einen vereinbarten Rückruf */
export function nextBusinessDay(today: Date): string {
  return formatIsoDate(addBusinessDays(startOfDay(today), 1));
}

/** Heute plus Kalendertage, ein Wochenende rückt auf den Montag */
export function weekdayAfterDays(today: Date, days: number): string {
  const start = startOfDay(today);
  return formatIsoDate(
    nextWeekday(new Date(start.getFullYear(), start.getMonth(), start.getDate() + days)),
  );
}

/**
 * Offen ist eine Wiedervorlage, bis zum Lead ein späteres Anrufergebnis erfasst ist.
 * Das Ergebnis, das sie angelegt hat, trägt denselben Zeitpunkt.
 */
export function isRecallOpen(recall: Recall, latest: CallOutcome | undefined): boolean {
  return !latest || latest.recordedAt <= recall.createdAt;
}

/** Offene Wiedervorlagen, je Lead nur die jüngste, nach Fälligkeit sortiert */
export function openRecalls(
  recalls: readonly Recall[],
  latestByLead: ReadonlyMap<string, CallOutcome>,
): Recall[] {
  const newest = new Map<string, Recall>();
  for (const recall of recalls) {
    const current = newest.get(recall.leadId);
    if (!current || recall.createdAt >= current.createdAt) newest.set(recall.leadId, recall);
  }
  return [...newest.values()]
    .filter((recall) => isRecallOpen(recall, latestByLead.get(recall.leadId)))
    .sort(
      (a, b) =>
        a.dueDate.localeCompare(b.dueDate) ||
        (a.dueTime ?? '99:99').localeCompare(b.dueTime ?? '99:99') ||
        a.leadName.localeCompare(b.leadName, 'de'),
    );
}

export type RecallBucket = 'overdue' | 'today' | 'soon' | 'later';

export const RECALL_BUCKETS: readonly RecallBucket[] = ['overdue', 'today', 'soon', 'later'];

export const RECALL_BUCKET_LABELS: Record<RecallBucket, string> = {
  overdue: 'Überfällig',
  today: 'Heute',
  soon: 'Nächste 7 Tage',
  later: 'Später',
};

/** Einordnung nach Fälligkeit, today als YYYY-MM-DD */
export function recallBucket(dueDate: string, today: string): RecallBucket {
  if (dueDate < today) return 'overdue';
  if (dueDate === today) return 'today';
  const [year = 1970, month = 1, day = 1] = today.split('-').map(Number);
  const limit = formatIsoDate(new Date(year, month - 1, day + 7));
  return dueDate <= limit ? 'soon' : 'later';
}

/** Fällig heute oder überfällig */
export function dueRecallCount(recalls: readonly Recall[], today: string): number {
  return recalls.filter((recall) => recall.dueDate <= today).length;
}

/** Grund in Worten, beim Vertragsende mit Monat */
export function recallReasonText(recall: Pick<Recall, 'reason' | 'contractEnd'>): string {
  return recall.reason === 'contractEnd' && recall.contractEnd
    ? `Vertragsende ${formatMonth(recall.contractEnd)}`
    : RECALL_REASON_LABELS[recall.reason];
}

/** YYYY-MM als MM/YYYY */
export function formatMonth(value: string): string {
  const [year, month] = value.split('-');
  return `${month}/${year}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function nextWeekday(date: Date): Date {
  const day = date.getDay();
  if (day === 6) return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 2);
  if (day === 0) return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return date;
}

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let left = days;
  while (left > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) left -= 1;
  }
  return result;
}

function formatIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
