import type { Appointment } from './types';

/** Dauer des Vor-Ort-Termins laut Leitfaden, in Minuten */
export const DEFAULT_APPOINTMENT_MINUTES = 30;
export const APPOINTMENT_MINUTE_OPTIONS = [30, 45, 60] as const;
export const DEFAULT_APPOINTMENT_TIME = '10:00';

const WEEKDAYS_DE = [
  'Sonntag',
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
] as const;

/** Eingabe im Formular, Datum als YYYY-MM-DD und Uhrzeit als HH:MM */
export interface AppointmentDraft {
  date: string;
  time: string;
  durationMinutes: number;
  hunterName: string;
  hunterEmail: string;
  contactName: string;
  contactEmail: string;
}

export type AppointmentDraftError = 'date' | 'time' | 'past' | 'hunter' | 'email';

export const APPOINTMENT_ERROR_LABELS: Record<AppointmentDraftError, string> = {
  date: 'Datum fehlt.',
  time: 'Uhrzeit fehlt.',
  past: 'Der Termin liegt in der Vergangenheit.',
  hunter: 'Hunter fehlt.',
  email: 'E-Mail-Adresse prüfen.',
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function weekdayIndex(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay();
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days)).toISOString().slice(0, 10);
}

/** Nächster Tourtag ab morgen, damit der Hunter planen kann */
export function nextTourDate(weekday: string, today: string): string {
  const target = WEEKDAYS_DE.indexOf(weekday as (typeof WEEKDAYS_DE)[number]);
  const tomorrow = addDays(today, 1);
  if (target < 0) return tomorrow;
  const offset = (target - weekdayIndex(tomorrow) + 7) % 7;
  return addDays(tomorrow, offset);
}

/** Erster Fehler der Eingabe; now ist der aktuelle Zeitpunkt als YYYY-MM-DDTHH:MM in Ortszeit */
export function validateAppointmentDraft(
  draft: AppointmentDraft,
  now: string,
): AppointmentDraftError | null {
  if (!DATE_PATTERN.test(draft.date)) return 'date';
  if (!TIME_PATTERN.test(draft.time)) return 'time';
  if (`${draft.date}T${draft.time}` <= now) return 'past';
  if (draft.hunterName.trim() === '') return 'hunter';
  for (const email of [draft.hunterEmail, draft.contactEmail]) {
    if (email.trim() !== '' && !EMAIL_PATTERN.test(email.trim())) return 'email';
  }
  return null;
}

function orNull(value: string): string | null {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed === '' ? null : trimmed;
}

/** Bereinigte Eingabe als Termin; startUtc rechnet die Oberfläche aus Datum und Uhrzeit */
export function toAppointment(
  draft: AppointmentDraft,
  lead: { id: string; name: string; location: string },
  startUtc: string,
  id: string,
  createdAt: string,
): Appointment {
  return {
    id,
    leadId: lead.id,
    leadName: lead.name,
    start: startUtc,
    durationMinutes: draft.durationMinutes,
    hunterName: draft.hunterName.trim(),
    hunterEmail: orNull(draft.hunterEmail)?.toLowerCase() ?? null,
    contactName: orNull(draft.contactName),
    contactEmail: orNull(draft.contactEmail)?.toLowerCase() ?? null,
    location: lead.location,
    createdAt,
  };
}

/** Jüngster Termin je Lead */
export function latestAppointmentByLead(
  appointments: readonly Appointment[],
): Map<string, Appointment> {
  const latest = new Map<string, Appointment>();
  for (const appointment of appointments) {
    const current = latest.get(appointment.leadId);
    if (!current || appointment.createdAt >= current.createdAt) {
      latest.set(appointment.leadId, appointment);
    }
  }
  return latest;
}

/** Termin in Ortszeit, etwa „Dienstag, 13.10.2026, 10:00 Uhr“ */
export interface LocalSlot {
  date: string;
  time: string;
}

export function formatSlot(slot: LocalSlot): string {
  const [y, m, d] = slot.date.split('-');
  return `${WEEKDAYS_DE[weekdayIndex(slot.date)]}, ${d}.${m}.${y}, ${slot.time} Uhr`;
}

export interface ConfirmationMail {
  subject: string;
  body: string;
}

/** Bestätigung an den Kunden. Sachlich, ohne Zusagen, die das Gespräch nicht gemacht hat. */
export function buildConfirmationMail(
  appointment: Appointment,
  slot: LocalSlot,
  callerName: string,
): ConfirmationMail {
  const greeting = appointment.contactName ? `Guten Tag ${appointment.contactName},` : 'Guten Tag,';
  const when = formatSlot(slot);
  return {
    subject: `Terminbestätigung CWS Workwear: ${when}`,
    body: [
      greeting,
      '',
      'vielen Dank für das freundliche Gespräch. Hiermit bestätige ich Ihnen den vereinbarten Termin:',
      '',
      `Termin: ${when} (ca. ${appointment.durationMinutes} Minuten)`,
      `Ort: ${appointment.leadName}, ${appointment.location}`,
      `Ihr Ansprechpartner bei CWS: ${appointment.hunterName}`,
      '',
      'Falls der Termin nicht passt, antworten Sie gern auf diese E-Mail.',
      '',
      'Freundliche Grüße',
      callerName,
      'CWS Workwear',
    ].join('\n'),
  };
}

/** mailto-Link für das Standard-Mailprogramm, der Hunter steht in Kopie */
export function mailtoHref(to: string | null, cc: string | null, mail: ConfirmationMail): string {
  const params = [`subject=${encodeURIComponent(mail.subject)}`];
  if (cc) params.push(`cc=${encodeURIComponent(cc)}`);
  params.push(`body=${encodeURIComponent(mail.body.replace(/\n/g, '\r\n'))}`);
  return `mailto:${to ? encodeURIComponent(to) : ''}?${params.join('&')}`;
}

function icsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function icsTime(iso: string): string {
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Zeilen über 75 Zeichen nach RFC 5545 umbrechen */
function fold(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = ` ${rest.slice(75)}`;
  }
  parts.push(rest);
  return parts.join('\r\n');
}

/** Kalendereintrag im iCalendar-Format, Zeiten in UTC */
export function buildIcs(appointment: Appointment, stamp: string): string {
  const end = new Date(
    new Date(appointment.start).getTime() + appointment.durationMinutes * 60_000,
  ).toISOString();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CWS Workwear//Lead-Cockpit Nordwest//DE',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${appointment.id}@lead-cockpit`,
    `DTSTAMP:${icsTime(stamp)}`,
    `DTSTART:${icsTime(appointment.start)}`,
    `DTEND:${icsTime(end)}`,
    `SUMMARY:${icsText(`CWS Workwear: Termin ${appointment.leadName}`)}`,
    `LOCATION:${icsText(`${appointment.leadName}, ${appointment.location}`)}`,
    `DESCRIPTION:${icsText(
      [
        `Hunter: ${appointment.hunterName}`,
        appointment.contactName ? `Ansprechpartner: ${appointment.contactName}` : null,
        appointment.contactEmail ? `E-Mail: ${appointment.contactEmail}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    )}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}
