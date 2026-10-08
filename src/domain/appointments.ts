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

/** Nächster Werktag (Montag bis Freitag) ab morgen, damit der Hunter planen kann */
export function nextWorkday(today: string): string {
  let date = addDays(today, 1);
  while ([0, 6].includes(weekdayIndex(date))) date = addDays(date, 1);
  return date;
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
    'PRODID:-//CWS Workwear//Lead-Cockpit New Business//DE',
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

/** Termin in der Übersicht der Teamleitung */
export interface TeamAppointment {
  id: string;
  leadId: string | null;
  leadName: string;
  /** Beginn als ISO-Zeitpunkt, null, wenn nur das Ergebnis gebucht wurde */
  start: string | null;
  hunterName: string;
  assistantName: string;
  status: 'confirmed' | 'open' | 'details_missing';
  /** True, wenn der Termin in diesem Browser erfasst wurde */
  live: boolean;
}

export const TEAM_APPOINTMENT_STATUS_LABELS: Record<TeamAppointment['status'], string> = {
  confirmed: 'Bestätigung erstellt',
  open: 'Bestätigung offen',
  details_missing: 'Termin ohne Details',
};

/**
 * Live-Termine aus diesem Browser. Gebuchte Termine ohne erfasste Details erscheinen
 * mit Status „ohne Details“, damit keine Bestätigung untergeht.
 */
export function liveTeamAppointments(
  appointments: readonly Appointment[],
  bookedWithoutDetails: readonly {
    id: string;
    leadId: string;
    leadName: string;
    owner: string | null;
  }[],
  assistantName: string,
): TeamAppointment[] {
  const latest = latestAppointmentByLead(appointments);
  const withDetails: TeamAppointment[] = [...latest.values()].map((appointment) => ({
    id: appointment.id,
    leadId: appointment.leadId,
    leadName: appointment.leadName,
    start: appointment.start,
    hunterName: appointment.hunterName,
    assistantName,
    status: appointment.confirmationOpenedAt ? 'confirmed' : 'open',
    live: true,
  }));
  const missing: TeamAppointment[] = bookedWithoutDetails
    .filter((booked) => !latest.has(booked.leadId))
    .map((booked) => ({
      id: booked.id,
      leadId: booked.leadId,
      leadName: booked.leadName,
      start: null,
      hunterName: booked.owner ?? 'nicht zugeordnet',
      assistantName,
      status: 'details_missing',
      live: true,
    }));
  return [...missing, ...withDetails];
}

const STATUS_ORDER: Record<TeamAppointment['status'], number> = {
  details_missing: 0,
  open: 1,
  confirmed: 2,
};

/** Offene zuerst, innerhalb des Status nach Terminbeginn */
export function sortTeamAppointments(rows: readonly TeamAppointment[]): TeamAppointment[] {
  return [...rows].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      (a.start ?? '').localeCompare(b.start ?? ''),
  );
}
