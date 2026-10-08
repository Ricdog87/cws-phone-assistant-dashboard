/**
 * Links in die Salesforce-Oberfläche (Lightning). Die Terminvergabe passiert direkt im
 * Salesforce-Kalender, die Wiedervorlage als Aufgabe; das Cockpit öffnet nur die passende
 * Seite. Keine Zugangsdaten, keine API.
 */

export type SalesforceObject = 'Account' | 'Lead' | 'Contact';

/** Präfixe der Datensatz-IDs in Salesforce */
const ID_PREFIXES: Record<string, SalesforceObject> = {
  '001': 'Account',
  '00Q': 'Lead',
  '003': 'Contact',
};

const ID_PATTERN = /^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/;

/** Objekt zur Salesforce-ID oder null, wenn die ID keine Salesforce-ID ist (etwa Demo-Daten) */
export function salesforceObjectOf(id: string | null | undefined): SalesforceObject | null {
  if (!id || !ID_PATTERN.test(id)) return null;
  return ID_PREFIXES[id.slice(0, 3)] ?? null;
}

/** Nur https-Adressen von Salesforce, sonst null. Ergebnis ohne Pfad und ohne Schrägstrich. */
export function normalizeSalesforceUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.toLowerCase();
    const salesforce =
      host.endsWith('.force.com') ||
      host.endsWith('.salesforce.com') ||
      host.endsWith('.salesforce-setup.com');
    return url.protocol === 'https:' && salesforce ? url.origin : null;
  } catch {
    return null;
  }
}

export interface TaskDefaults {
  subject: string;
  /** Salesforce-ID des Accounts oder Leads, bei Demo-Daten null */
  recordId: string | null;
  /** Fälligkeitsdatum YYYY-MM-DD */
  dueDate: string;
  description?: string;
}

/** Vorbelegung als defaultFieldValues; Accounts gehen in „Bezug zu“ (WhatId), Leads und Kontakte in „Name“ (WhoId) */
function defaultFieldValues(fields: [string, string][], recordId: string | null): string {
  const object = salesforceObjectOf(recordId);
  const related: [string, string][] = [];
  if (recordId && object === 'Account') related.push(['WhatId', recordId]);
  if (recordId && (object === 'Lead' || object === 'Contact')) related.push(['WhoId', recordId]);
  const [subject, ...rest] = fields;
  return [...(subject ? [subject] : []), ...related, ...rest]
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join(',');
}

/** Formular „Neue Aufgabe“ für die Wiedervorlage, mit Fälligkeitsdatum (ActivityDate) */
export function newTaskUrl(baseUrl: string, defaults: TaskDefaults): string {
  const fields: [string, string][] = [
    ['Subject', defaults.subject],
    ['ActivityDate', defaults.dueDate],
  ];
  if (defaults.description) fields.push(['Description', defaults.description]);
  return `${baseUrl}/lightning/o/Task/new?defaultFieldValues=${defaultFieldValues(fields, defaults.recordId)}`;
}

/** Aufgabenliste in Salesforce */
export function tasksUrl(baseUrl: string): string {
  return `${baseUrl}/lightning/o/Task/home`;
}

/**
 * Salesforce-Kalender in der Wochenansicht ab startDate (YYYY-MM-DD). Dort trägt die
 * Telefonassistenz den vereinbarten Termin mit Datum, Uhrzeit und Hunter ein.
 */
export function calendarUrl(baseUrl: string, startDate: string): string {
  return `${baseUrl}/lightning/o/Event/home?startDate=${startDate}&view=week`;
}

/** Datensatz in Salesforce oder null, wenn die ID keine Salesforce-ID ist */
export function recordUrl(baseUrl: string, recordId: string | null | undefined): string | null {
  const object = salesforceObjectOf(recordId);
  return object && recordId ? `${baseUrl}/lightning/r/${object}/${recordId}/view` : null;
}
