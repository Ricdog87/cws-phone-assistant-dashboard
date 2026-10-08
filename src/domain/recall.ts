import { BOOKING_LEAD_DAYS_MIN } from './routingConfig';
import { CONTRACT_RECALL_MONTHS_BEFORE } from './qualificationConfig';
import type { CallOutcome, Recall, RecallReason } from './types';

export const RECALL_REASON_LABELS: Record<RecallReason, string> = {
  callback: 'Rückruf vereinbart',
  contractEnd: 'Vertragsende',
};

/** Kurznotiz zur Wiedervorlage, kein Gesprächsprotokoll */
export const RECALL_NOTE_MAX_LENGTH = 200;

/** Erster des Monats, neun Monate vor Vertragsende, sonst der nächste Werktag. */
export function suggestRecallDate(contractEnd: string, today: Date): string | 'bookNow' {
  const match = /^(\d{4})-(\d{2})$/.exec(contractEnd);
  if (!match) return 'bookNow';
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!year || month < 1 || month > 12) return 'bookNow';

  const recall = nextWeekday(new Date(year, month - 1 - CONTRACT_RECALL_MONTHS_BEFORE, 1));
  const earliest = addBusinessDays(startOfDay(today), BOOKING_LEAD_DAYS_MIN);
  if (recall < earliest) return 'bookNow';
  return formatIsoDate(recall);
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

/** Betreff der Aufgabe in Salesforce */
export function taskSubject(leadName: string): string {
  return `Wiedervorlage: ${leadName}`;
}

/** Beschreibung der Aufgabe in Salesforce, ohne Telefonnummern */
export function taskDescription(input: {
  assistantName: string;
  hunterName: string | null;
  reason: RecallReason;
  dueTime: string | null;
  contractEnd: string | null;
  note: string | null;
}): string {
  return [
    `Angelegt von ${input.assistantName} über das Lead-Cockpit.`,
    `Grund: ${RECALL_REASON_LABELS[input.reason]}`,
    input.dueTime ? `Uhrzeit: ${input.dueTime} Uhr` : null,
    input.contractEnd ? `Vertragsende: ${formatMonth(input.contractEnd)}` : null,
    input.hunterName ? `Hunter: ${input.hunterName}` : null,
    input.note ? `Notiz: ${input.note}` : null,
  ]
    .filter(Boolean)
    .join('\n');
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
