import type { Lead } from '../../domain/types';
import type { BriefingRequest } from './schema';

// Nur relative Importe: diese Datei wird auch vom Proxy im Vite-Server geladen

export const PLACEHOLDER_COMPANY = '{{firma}}';
export const PLACEHOLDER_CONTACT = '{{ansprechpartner}}';

export const SYSTEM_PROMPT = [
  'Du erstellst Gesprächsbriefings für Telefonassistenten im Neukundenvertrieb von CWS Workwear',
  '(Mietberufskleidung im Vollservice). Ziel des Anrufs ist ein kurzer Termin vor Ort.',
  'Nutze ausschließlich die übergebenen Merkmale. Erfinde keine Fakten, Zahlen, Referenzen,',
  'Preise oder Zusagen. Sprich das Gegenüber mit Sie an. Schreibe sachlich, kurz und ohne',
  'Übertreibungen.',
  `Verwende für den Firmennamen ausschließlich ${PLACEHOLDER_COMPANY}, für den Ansprechpartner`,
  `ausschließlich ${PLACEHOLDER_CONTACT} und für den Namen des Anrufenden [Name].`,
  'Antworte nur mit JSON nach dem vorgegebenen Schema:',
  'aufhaenger: 1 bis 5 kurze Stichpunkte, jeweils aus einem Merkmal abgeleitet.',
  'einstiegssatz: höchstens drei Sätze, beginnt mit einer Begrüßung, endet mit der Frage',
  'nach einem kurzen Termin vor Ort.',
  'einwandbehandlung: 2 bis 4 Einträge im Format "Einwand: … Antwort: …".',
].join(' ');

/** Merkmale für das Modell. Firmenname, Ansprechpartner und Telefon bleiben im Browser. */
export function buildBriefingRequest(lead: Lead): BriefingRequest {
  return {
    branche: lead.industry,
    ort: lead.city,
    gewerblicheMitarbeitende: Math.round(lead.commercialEmployees),
    traegerzahl: Math.round(lead.wearerCount),
    offeneStellen: Math.round(lead.openPositions),
    zertifizierung: lead.certification,
    standorterweiterung: lead.siteExpansion,
    wechselGeschaeftsfuehrung: lead.managementChange,
    ansprechpartnerBekannt: lead.contactName !== null,
    funktionAnsprechpartner: lead.contactRole,
    durchwahlBekannt: lead.hasDirectDial,
  };
}

export function buildUserPrompt(request: BriefingRequest): string {
  return `Merkmale des Betriebs:\n${JSON.stringify(request, null, 2)}`;
}

/** Setzt Firmenname und Ansprechpartner ein. Ohne Ansprechpartner entfällt der Platzhalter. */
export function fillPlaceholders(
  text: string,
  values: { company: string; contact: string | null },
): string {
  const withCompany = text.split(PLACEHOLDER_COMPANY).join(values.company);
  const withContact = values.contact
    ? withCompany.split(PLACEHOLDER_CONTACT).join(values.contact)
    : withCompany.split(` ${PLACEHOLDER_CONTACT}`).join('').split(PLACEHOLDER_CONTACT).join('');
  return withContact
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
