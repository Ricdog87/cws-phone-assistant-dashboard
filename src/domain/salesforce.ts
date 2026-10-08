/**
 * Salesforce-IDs und Links in die Salesforce-Oberfläche (Lightning). Die Terminvergabe
 * passiert direkt im Salesforce-Kalender; Anrufprotokolle und Wiedervorlagen überträgt die
 * Serverfunktion /api/salesforce (siehe salesforceSync.ts).
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

/**
 * Salesforce-Kalender in der Wochenansicht ab startDate (YYYY-MM-DD). Dort trägt die
 * Telefonassistenz den vereinbarten Termin mit Datum, Uhrzeit und Hunter ein.
 */
export function calendarUrl(baseUrl: string, startDate: string): string {
  return `${baseUrl}/lightning/o/Event/home?startDate=${startDate}&view=week`;
}
