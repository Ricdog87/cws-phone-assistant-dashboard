import { OUTCOME_LABELS } from './outcomes';
import {
  CALL_SOLUTION_LABELS,
  CONTACT_ROLE_LABELS,
  PROTOCOL_FLAGS,
  PROTOCOL_FLAG_LABELS,
  isNetContact,
} from './protocol';
import type { TeamCall } from './teamCalls';
import type { CallOutcome, CallProtocol, ContactUpdate } from './types';

/** Byte Order Mark, damit Excel die Datei als UTF-8 erkennt */
export const CSV_BOM = '\uFEFF';
export const CSV_SEPARATOR = ';';

function formatDecimal(value: number, digits: number): string {
  return value.toFixed(digits).replace('.', ',');
}

export function escapeCsvCell(value: string): string {
  return /[";\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Spalten des Gesprächsprotokolls, gleich in beiden Exporten */
function protocolHeader(): string[] {
  return [
    'Gesprächspartner',
    'Nettokontakt',
    'Aktuelle Lösung',
    'Wettbewerber',
    ...PROTOCOL_FLAGS.map((flag) => PROTOCOL_FLAG_LABELS[flag]),
    'Notiz',
  ];
}

function protocolCells(protocol: CallProtocol | undefined): string[] {
  return [
    protocol?.contactRole ? CONTACT_ROLE_LABELS[protocol.contactRole] : '',
    isNetContact(protocol) ? 'ja' : 'nein',
    protocol?.solution ? CALL_SOLUTION_LABELS[protocol.solution] : '',
    protocol?.competitor ?? '',
    ...PROTOCOL_FLAGS.map((flag) => (protocol?.[flag] ? 'ja' : '')),
    protocol?.note ?? '',
  ];
}

const HEADER = [
  'Zeitpunkt',
  'Lead-ID',
  'Firma',
  'Ergebnis',
  'Band',
  'Score',
  'Fit',
  'Potenzial',
  'Erreichbarkeit',
  'Gewicht Fit',
  'Gewicht Potenzial',
  'Gewicht Erreichbarkeit',
  'Hunter',
  'Kontrolle',
  'Position',
  'Quelle',
  ...protocolHeader(),
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
      formatDecimal(o.dimensions.potential, 1),
      formatDecimal(o.dimensions.reachability, 1),
      formatDecimal(o.normalizedWeights.fit, 1),
      formatDecimal(o.normalizedWeights.potential, 1),
      formatDecimal(o.normalizedWeights.reachability, 1),
      o.owner ?? '',
      o.isControl ? 'ja' : 'nein',
      String(o.queuePosition),
      o.sourceId,
      ...protocolCells(o.protocol),
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

const CALL_HEADER = [
  'Datum',
  'Firma',
  'Ort',
  'Hunter',
  'Telefonassistenz',
  'Ergebnis',
  ...protocolHeader(),
];

/** Gespräche aus der Übersicht der Führung, etwa alle Firmen beim Wettbewerb */
export function callsToCsv(calls: readonly TeamCall[]): string {
  const rows = calls.map((call) =>
    [
      new Date(call.recordedAt).toLocaleDateString('de-DE'),
      call.leadName,
      call.city,
      call.hunterName,
      call.assistantName,
      OUTCOME_LABELS[call.outcome],
      ...protocolCells(call.protocol),
    ]
      .map(escapeCsvCell)
      .join(CSV_SEPARATOR),
  );
  return CSV_BOM + [CALL_HEADER.join(CSV_SEPARATOR), ...rows].join('\r\n') + '\r\n';
}
