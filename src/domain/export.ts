import { OUTCOME_LABELS } from './outcomes';
import type { CallOutcome, ContactUpdate } from './types';

/** Byte Order Mark, damit Excel die Datei als UTF-8 erkennt */
export const CSV_BOM = '\uFEFF';
export const CSV_SEPARATOR = ';';

function formatDecimal(value: number, digits: number): string {
  return value.toFixed(digits).replace('.', ',');
}

export function escapeCsvCell(value: string): string {
  return /[";\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

const HEADER = [
  'Zeitpunkt',
  'Lead-ID',
  'Firma',
  'Ergebnis',
  'Band',
  'Score',
  'Fit',
  'Nähe',
  'Potenzial',
  'Erreichbarkeit',
  'Gewicht Fit',
  'Gewicht Nähe',
  'Gewicht Potenzial',
  'Gewicht Erreichbarkeit',
  'Abstand km',
  'Umweg Minuten',
  'Kontrolle',
  'Position',
  'Quelle',
];

/** Anrufergebnisse als CSV mit Semikolon, Dezimalkomma, CRLF und BOM */
export function outcomesToCsv(outcomes: readonly CallOutcome[]): string {
  const rows = outcomes.map((o) =>
    [
      o.recordedAt,
      o.leadId,
      o.leadName,
      OUTCOME_LABELS[o.outcome],
      o.band,
      String(o.score),
      formatDecimal(o.dimensions.fit, 1),
      formatDecimal(o.dimensions.proximity, 1),
      formatDecimal(o.dimensions.potential, 1),
      formatDecimal(o.dimensions.reachability, 1),
      formatDecimal(o.normalizedWeights.fit, 1),
      formatDecimal(o.normalizedWeights.proximity, 1),
      formatDecimal(o.normalizedWeights.potential, 1),
      formatDecimal(o.normalizedWeights.reachability, 1),
      formatDecimal(o.distanceKm, 2),
      formatDecimal(o.detourMinutes, 1),
      o.isControl ? 'ja' : 'nein',
      String(o.queuePosition),
      o.sourceId,
    ]
      .map(escapeCsvCell)
      .join(CSV_SEPARATOR),
  );
  return CSV_BOM + [HEADER.join(CSV_SEPARATOR), ...rows].join('\r\n') + '\r\n';
}

const CONTACT_HEADER = [
  'Erfasst am',
  'Lead-ID',
  'Firma',
  'Ansprechpartner',
  'Funktion',
  'Durchwahl',
  'E-Mail',
  'Quelle',
];

/**
 * Im Gespräch erfasste Kontakte für den Rückweg nach Salesforce. Gleiches
 * Format wie die Anrufergebnisse; die Lead-ID ist der Schlüssel für das
 * Aktualisieren des Leads beim Import.
 */
export function contactsToCsv(contacts: readonly ContactUpdate[]): string {
  const rows = contacts.map((c) =>
    [
      c.capturedAt,
      c.leadId,
      c.leadName,
      c.name ?? '',
      c.role ?? '',
      c.directDial ?? '',
      c.email ?? '',
      c.source === 'call' ? 'Anruf' : c.source,
    ]
      .map(escapeCsvCell)
      .join(CSV_SEPARATOR),
  );
  return CSV_BOM + [CONTACT_HEADER.join(CSV_SEPARATOR), ...rows].join('\r\n') + '\r\n';
}
