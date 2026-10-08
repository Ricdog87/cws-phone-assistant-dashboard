/**
 * Links in die Salesforce-Oberfläche (Lightning). Die Terminvergabe passiert direkt in
 * Salesforce; das Cockpit öffnet nur das passende Formular. Keine Zugangsdaten, keine API.
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

export interface EventDefaults {
  subject: string;
  /** Salesforce-ID des Accounts oder Leads, bei Demo-Daten null */
  recordId: string | null;
  description?: string;
}

/**
 * Formular „Neuer Termin“ mit vorausgefüllten Feldern. Accounts gehen in „Bezug zu“
 * (WhatId), Leads und Kontakte in „Name“ (WhoId).
 */
export function newEventUrl(baseUrl: string, defaults: EventDefaults): string {
  const fields: [string, string][] = [['Subject', defaults.subject]];
  const object = salesforceObjectOf(defaults.recordId);
  if (defaults.recordId && object === 'Account') fields.push(['WhatId', defaults.recordId]);
  if (defaults.recordId && (object === 'Lead' || object === 'Contact')) {
    fields.push(['WhoId', defaults.recordId]);
  }
  if (defaults.description) fields.push(['Description', defaults.description]);
  const values = fields.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join(',');
  return `${baseUrl}/lightning/o/Event/new?defaultFieldValues=${values}`;
}

/** Kalender in Salesforce */
export function calendarUrl(baseUrl: string): string {
  return `${baseUrl}/lightning/o/Event/home`;
}

/** Datensatz in Salesforce oder null, wenn die ID keine Salesforce-ID ist */
export function recordUrl(baseUrl: string, recordId: string | null | undefined): string | null {
  const object = salesforceObjectOf(recordId);
  return object && recordId ? `${baseUrl}/lightning/r/${object}/${recordId}/view` : null;
}
