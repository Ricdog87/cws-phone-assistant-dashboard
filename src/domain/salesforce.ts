/**
 * Salesforce-IDs der Leads und Links in die Salesforce-Oberfläche (Lightning). Termine bucht
 * die Telefonassistenz direkt in Salesforce; Anrufprotokolle und Wiedervorlagen überträgt die
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
    const salesforce = host.endsWith('.force.com') || host.endsWith('.salesforce.com');
    return url.protocol === 'https:' && salesforce ? url.origin : null;
  } catch {
    return null;
  }
}

/** Datensatz in Lightning, etwa der Account; null, wenn die ID keine Salesforce-ID ist */
export function recordUrl(baseUrl: string, recordId: string | null | undefined): string | null {
  const object = salesforceObjectOf(recordId);
  return object && recordId ? `${baseUrl}/lightning/r/${object}/${recordId}/view` : null;
}

function demoDigits(key: string): string {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return String((h >>> 0) % 100_000_000).padStart(8, '0');
}

/**
 * Platzhalter im Format einer Account-ID für Demo-Leads ohne Salesforce-ID. Den Account gibt
 * es in Salesforce nicht; der Link zeigt nur, wohin er mit echten Daten führt.
 */
export function demoAccountId(leadId: string): string {
  return `001DEMO${demoDigits(leadId)}`;
}

/** Platzhalter im Format einer Kontakt-ID für den Ansprechpartner eines Demo-Leads */
export function demoContactId(leadId: string): string {
  return `003DEMO${demoDigits(`${leadId}:kontakt`)}`;
}

/**
 * Link auf den Ansprechpartner: mit Kontakt-ID direkt der Kontakt. Ohne Kontakt-ID beim
 * Account dessen Kontaktliste, beim Salesforce-Lead der Lead selbst, denn dort steht der
 * Ansprechpartner im Datensatz. Sonst null.
 */
export function contactUrl(
  baseUrl: string,
  recordId: string | null | undefined,
  contactId: string | null | undefined,
): string | null {
  if (salesforceObjectOf(contactId) === 'Contact') return recordUrl(baseUrl, contactId);
  const object = salesforceObjectOf(recordId);
  if (object === 'Account' && recordId) {
    return `${baseUrl}/lightning/r/Account/${recordId}/related/Contacts/view`;
  }
  return object === 'Lead' ? recordUrl(baseUrl, recordId) : null;
}
