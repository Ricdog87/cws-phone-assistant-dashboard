import { localWeekRange } from './goals';
import type { CallOutcome, ScoredLead } from './types';

/** Zuordnung der Telefonassistenzen zu einem Hunter, wie in der Aufteilung PA */
export interface HunterAssignment {
  hunter: string;
  assistants: readonly string[];
  /** Woche bisher aus Quellen außerhalb dieses Browsers, etwa Demo-Werte oder Salesforce */
  baselineWeekCalls: number;
  baselineWeekAppointments: number;
}

export interface HunterRow {
  hunter: string;
  assistants: readonly string[];
  /** Neukunden-Accounts in der Potenzialliste */
  accounts: number;
  aAccounts: number;
  /** Accounts ohne jede Aktivität in Salesforce */
  neverContacted: number;
  weekCalls: number;
  weekAppointments: number;
  appointmentsPer100: number;
}

/**
 * Potenzialliste je Hunter: Bestand aus den Leads, Wochenstand aus Basiswerten
 * plus den in diesem Browser erfassten Anrufen. Sortiert nach Terminen der Woche,
 * wenigste zuerst, damit sichtbar wird, wo Termine fehlen.
 */
export function hunterRows(
  assignments: readonly HunterAssignment[],
  scored: readonly ScoredLead[],
  outcomes: readonly CallOutcome[],
  now: Date = new Date(),
): HunterRow[] {
  const { from, to } = localWeekRange(now);
  return assignments
    .map((assignment) => {
      const list = scored.filter(
        (entry) => !entry.lead.isCustomer && entry.lead.owner === assignment.hunter,
      );
      const week = outcomes.filter((outcome) => {
        const at = Date.parse(outcome.recordedAt);
        return outcome.owner === assignment.hunter && at >= from && at < to;
      });
      const weekCalls = assignment.baselineWeekCalls + week.length;
      const weekAppointments =
        assignment.baselineWeekAppointments +
        week.filter((outcome) => outcome.outcome === 'appointment').length;
      return {
        hunter: assignment.hunter,
        assistants: assignment.assistants,
        accounts: list.length,
        aAccounts: list.filter((entry) => entry.band === 'A').length,
        neverContacted: list.filter((entry) => !entry.lead.lastActivity).length,
        weekCalls,
        weekAppointments,
        appointmentsPer100: weekCalls === 0 ? 0 : (weekAppointments / weekCalls) * 100,
      };
    })
    .sort(
      (a, b) =>
        a.weekAppointments - b.weekAppointments ||
        b.aAccounts - a.aAccounts ||
        a.hunter.localeCompare(b.hunter, 'de'),
    );
}
