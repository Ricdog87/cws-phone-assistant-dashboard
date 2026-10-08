import { OUTCOME_LABELS } from './outcomes';
import { CONTACT_ROLE_LABELS, PROTOCOL_FLAG_LABELS, protocolFlags, solutionText } from './protocol';
import { recallReasonText } from './recall';
import { salesforceObjectOf } from './salesforce';
import type { CallOutcome, ContactUpdate, Recall } from './types';

/**
 * Aufgabe (Task) für Salesforce. Das Cockpit legt nur Aufgaben an: das Anrufprotokoll als
 * erledigte Aufgabe „Anruf“ und die Wiedervorlage als offene Aufgabe mit Fälligkeit.
 */
export interface SalesforceTaskInput {
  kind: 'callLog' | 'recall';
  subject: string;
  description: string;
  /** Fälligkeit oder Anrufdatum, YYYY-MM-DD */
  activityDate: string;
  status: 'Completed' | 'Not Started';
  /** Ergebnis des Anrufs, nur beim Anrufprotokoll */
  callDisposition: string | null;
  /** Erinnerung als ISO-Zeitpunkt, nur bei Wiedervorlage mit Uhrzeit */
  reminderAt: string | null;
  /** Account (WhatId) oder Lead/Kontakt (WhoId); bei Demo-Daten null */
  whatId: string | null;
  whoId: string | null;
}

export type SyncStatus = 'pending' | 'synced' | 'failed' | 'notConnected' | 'demo';

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  pending: 'Wird übertragen',
  synced: 'In Salesforce',
  failed: 'Fehler, neuer Versuch folgt',
  notConnected: 'Salesforce nicht verbunden',
  demo: 'In Salesforce (Demo)',
};

/** Eintrag im Postausgang nach Salesforce, je Anrufergebnis oder Wiedervorlage einer */
export interface SyncItem {
  /** Gleich der ID des Ergebnisses oder der Wiedervorlage */
  id: string;
  task: SalesforceTaskInput;
  status: SyncStatus;
  attempts: number;
  /** ID der angelegten Aufgabe in Salesforce */
  salesforceId: string | null;
  updatedAt: string;
}

/** Bezug der Aufgabe: Accounts in „Bezug zu“, Leads und Kontakte in „Name“ */
export function relatedIds(recordId: string): { whatId: string | null; whoId: string | null } {
  const object = salesforceObjectOf(recordId);
  return {
    whatId: object === 'Account' ? recordId : null,
    whoId: object === 'Lead' || object === 'Contact' ? recordId : null,
  };
}

function localDate(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Ansprechpartner aus dem Gespräch, ohne einen Kontakt in Salesforce anzulegen */
function contactLines(contact: ContactUpdate | undefined): string[] {
  if (!contact) return [];
  const person = [contact.name, contact.role].filter(Boolean).join(', ');
  return [
    person ? `Ansprechpartner: ${person}` : null,
    contact.directDial ? `Durchwahl: ${contact.directDial}` : null,
    contact.email ? `E-Mail: ${contact.email}` : null,
  ].filter((line): line is string => line !== null);
}

/** Anrufprotokoll als erledigte Aufgabe „Anruf“ */
export function callLogTask(
  outcome: CallOutcome,
  assistantName: string,
  contact?: ContactUpdate,
): SalesforceTaskInput {
  const protocol = outcome.protocol;
  const flags = protocolFlags(protocol).map((flag) => PROTOCOL_FLAG_LABELS[flag]);
  const lines = [
    `Ergebnis: ${OUTCOME_LABELS[outcome.outcome]}`,
    protocol?.contactRole ? `Gesprächspartner: ${CONTACT_ROLE_LABELS[protocol.contactRole]}` : null,
    solutionText(protocol) ? `Aktuelle Lösung: ${solutionText(protocol)}` : null,
    flags.length > 0 ? `Hinweise: ${flags.join(', ')}` : null,
    ...contactLines(contact),
    protocol?.note ? `Notiz: ${protocol.note}` : null,
    outcome.owner ? `Hunter: ${outcome.owner}` : null,
    `Erfasst von ${assistantName} über das Lead-Cockpit.`,
  ].filter((line): line is string => line !== null);
  return {
    kind: 'callLog',
    subject: `Anruf: ${outcome.leadName}`,
    description: lines.join('\n'),
    activityDate: localDate(outcome.recordedAt),
    status: 'Completed',
    callDisposition: OUTCOME_LABELS[outcome.outcome],
    reminderAt: null,
    ...relatedIds(outcome.leadId),
  };
}

/** Wiedervorlage als offene Aufgabe mit Fälligkeit und, bei Uhrzeit, mit Erinnerung */
export function recallTask(recall: Recall, assistantName: string): SalesforceTaskInput {
  const lines = [
    `Grund: ${recallReasonText(recall)}`,
    recall.dueTime ? `Uhrzeit: ${recall.dueTime} Uhr` : null,
    recall.note ? `Notiz: ${recall.note}` : null,
    recall.hunterName ? `Hunter: ${recall.hunterName}` : null,
    `Angelegt von ${assistantName} über das Lead-Cockpit.`,
  ].filter((line): line is string => line !== null);
  return {
    kind: 'recall',
    subject: `Wiedervorlage: ${recall.leadName}`,
    description: lines.join('\n'),
    activityDate: recall.dueDate,
    status: 'Not Started',
    callDisposition: null,
    reminderAt: recall.dueTime
      ? new Date(`${recall.dueDate}T${recall.dueTime}:00`).toISOString()
      : null,
    ...relatedIds(recall.leadId),
  };
}

/** Noch zu übertragen: neu, fehlgeschlagen oder ohne Verbindung */
export function needsSync(item: SyncItem): boolean {
  return item.status === 'pending' || item.status === 'failed' || item.status === 'notConnected';
}
