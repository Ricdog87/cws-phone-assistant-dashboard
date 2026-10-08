import { COMPETITORS } from './qualificationConfig';
import type { CallProtocol, CallSolution, ContactRole } from './types';

/** Auswahl „Aktuelle Lösung“ in der Reihenfolge aus dem Vertrieb */
export const CALL_SOLUTIONS: readonly CallSolution[] = [
  'companyBuys',
  'employeesBuy',
  'competitor',
  'none',
];

export const CALL_SOLUTION_LABELS: Record<CallSolution, string> = {
  companyBuys: 'Kauft Berufskleidung',
  employeesBuy: 'Mitarbeitende kaufen selbst',
  competitor: 'Wettbewerb (Mietservice)',
  none: 'Keine Berufskleidung',
};

export const CONTACT_ROLES: readonly ContactRole[] = ['decisionMaker', 'gatekeeper', 'other'];

/** Bezeichnungen wie in der Gesprächs-Checkliste */
export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  decisionMaker: 'Entscheider',
  gatekeeper: 'Zentrale',
  other: 'Sonstige',
};

export { COMPETITORS };

export type ProtocolFlag =
  'companyDissolved' | 'centralDecision' | 'existingCustomer' | 'doNotCall';

export const PROTOCOL_FLAGS: readonly ProtocolFlag[] = [
  'companyDissolved',
  'centralDecision',
  'existingCustomer',
  'doNotCall',
];

export const PROTOCOL_FLAG_LABELS: Record<ProtocolFlag, string> = {
  companyDissolved: 'Firma erloschen',
  centralDecision: 'Zentralentscheidung',
  existingCustomer: 'Bestandskunde',
  doNotCall: 'Nicht mehr anrufen',
};

/** Notiz zum Telefonat, kurz und ohne private Angaben */
export const PROTOCOL_NOTE_MAX_LENGTH = 500;

export function emptyProtocol(): CallProtocol {
  return {
    contactRole: null,
    solution: null,
    competitor: null,
    companyDissolved: false,
    centralDecision: false,
    existingCustomer: false,
    doNotCall: false,
    note: null,
  };
}

/** Protokoll mit mindestens einer Angabe */
export function hasProtocolInfo(protocol: CallProtocol | undefined): protocol is CallProtocol {
  if (!protocol) return false;
  return (
    protocol.contactRole !== null ||
    protocol.solution !== null ||
    protocol.note !== null ||
    PROTOCOL_FLAGS.some((flag) => protocol[flag])
  );
}

/** Nettokontakt: Gespräch mit dem Entscheider, nicht nur mit der Zentrale */
export function isNetContact(protocol: CallProtocol | undefined): boolean {
  return protocol?.contactRole === 'decisionMaker';
}

/** Gesetzte Merkmale in Anzeigereihenfolge */
export function protocolFlags(protocol: CallProtocol | undefined): ProtocolFlag[] {
  return protocol ? PROTOCOL_FLAGS.filter((flag) => protocol[flag]) : [];
}

/** Aktuelle Lösung in Worten, bei Wettbewerb mit Anbieter */
export function solutionText(protocol: CallProtocol | undefined): string | null {
  if (!protocol?.solution) return null;
  if (protocol.solution === 'competitor' && protocol.competitor) {
    return `Wettbewerb: ${protocol.competitor}`;
  }
  return CALL_SOLUTION_LABELS[protocol.solution];
}

/** Bereinigt Eingaben: Anbieter nur bei Wettbewerb, leere Notiz als null */
export function normalizeProtocol(protocol: CallProtocol): CallProtocol {
  const note = protocol.note?.trim().slice(0, PROTOCOL_NOTE_MAX_LENGTH) ?? '';
  return {
    ...protocol,
    competitor: protocol.solution === 'competitor' ? protocol.competitor : null,
    note: note ? note : null,
  };
}

/** Gleicher Inhalt nach dem Bereinigen, etwa um ungespeicherte Änderungen zu erkennen */
export function sameProtocol(a: CallProtocol, b: CallProtocol): boolean {
  const left = normalizeProtocol(a);
  const right = normalizeProtocol(b);
  return (Object.keys(left) as (keyof CallProtocol)[]).every((key) => left[key] === right[key]);
}
