import type { QueueEntry } from './types';

/**
 * Regelbasiertes Gesprächsbriefing aus den Lead-Merkmalen.
 * Offener Abstimmungspunkt: Formulierungen mit dem Prototyp und dem Vertrieb abgleichen.
 */

export type HookKind =
  | 'open_positions'
  | 'site_expansion'
  | 'management_change'
  | 'certification'
  | 'on_route'
  | 'wearers';

export interface Hook {
  kind: HookKind;
  text: string;
  /** Satzbaustein für den Gesprächseinstieg */
  opener: string;
}

export interface Briefing {
  contact: string;
  hooks: Hook[];
  openingLine: string;
}

/** Bis zu diesem Umweg gilt ein Lead als direkt an der Route */
export const ON_ROUTE_MAX_DETOUR_MINUTES = 5;

export function buildHooks(entry: Pick<QueueEntry, 'lead' | 'detourMinutes'>): Hook[] {
  const { lead, detourMinutes } = entry;
  const hooks: Hook[] = [];

  if (lead.openPositions > 0) {
    hooks.push({
      kind: 'open_positions',
      text: `${lead.openPositions} offene Stellen im gewerblichen Bereich`,
      opener: `ich habe gesehen, dass Sie gerade ${lead.openPositions} gewerbliche Stellen besetzen. Neue Mitarbeitende brauchen ab dem ersten Tag passende Berufskleidung.`,
    });
  }
  if (lead.siteExpansion) {
    hooks.push({
      kind: 'site_expansion',
      text: 'Standorterweiterung angekündigt',
      opener:
        'Sie erweitern gerade Ihren Standort. Das ist meist der Moment, in dem die Versorgung mit Arbeitskleidung neu aufgesetzt wird.',
    });
  }
  if (lead.managementChange) {
    hooks.push({
      kind: 'management_change',
      text: 'Wechsel in der Geschäftsführung',
      opener:
        'mit der neuen Geschäftsführung werden oft auch Dienstleister neu bewertet. Dafür möchte ich Ihnen kurz eine Alternative zeigen.',
    });
  }
  if (lead.certification) {
    hooks.push({
      kind: 'certification',
      text: `Zertifizierung ${lead.certification}`,
      opener: `Sie sind nach ${lead.certification} zertifiziert. Wir dokumentieren die Pflege der Kleidung so, dass es im Audit passt.`,
    });
  }
  if (detourMinutes <= ON_ROUTE_MAX_DETOUR_MINUTES) {
    hooks.push({
      kind: 'on_route',
      text: `Liegt an der Serviceroute, ${formatMinutes(detourMinutes)} Umweg`,
      opener:
        'unser Servicefahrer ist ohnehin regelmäßig bei Ihnen in der Nähe. Ein Termin vor Ort ist deshalb kurzfristig möglich.',
    });
  }
  if (hooks.length === 0) {
    hooks.push({
      kind: 'wearers',
      text: `Rund ${lead.wearerCount} Träger von Berufskleidung`,
      opener: `bei rund ${lead.wearerCount} Trägern lohnt sich ein Blick auf Mietberufskleidung im Vollservice.`,
    });
  }
  return hooks;
}

export function contactLabel(entry: Pick<QueueEntry, 'lead'>): string {
  const { contactName, contactRole } = entry.lead;
  if (!contactName)
    return 'Ansprechpartner unbekannt, Zentrale fragen nach Leitung Produktion oder Einkauf';
  return contactRole ? `${contactName}, ${contactRole}` : contactName;
}

export function buildBriefing(
  entry: Pick<QueueEntry, 'lead' | 'detourMinutes'>,
  callerName = '[Name]',
): Briefing {
  const hooks = buildHooks(entry);
  const greeting = entry.lead.contactName ? `Guten Tag ${entry.lead.contactName}` : 'Guten Tag';
  const first = hooks[0];
  const opener = first ? ` ${first.opener}` : '';
  return {
    contact: contactLabel(entry),
    hooks,
    openingLine: `${greeting}, hier ist ${callerName} von CWS Workwear,${opener} Hätten Sie diese Woche 15 Minuten für einen kurzen Termin vor Ort?`,
  };
}

export function formatMinutes(minutes: number): string {
  return `${minutes.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Min.`;
}
