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

/**
 * Platzhalter im Format einer Account-ID für Demo-Leads ohne Salesforce-ID. Den Account gibt
 * es in Salesforce nicht; der Link zeigt nur, wohin er mit echten Daten führt.
 */
export function demoAccountId(leadId: string): string {
  let h = 2166136261;
  for (let i = 0; i < leadId.length; i++) {
    h ^= leadId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `001DEMO${String((h >>> 0) % 100_000_000).padStart(8, '0')}`;
}
