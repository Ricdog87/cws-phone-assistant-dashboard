import type { SyncStatus } from './salesforceSync';

/** Termin in der Übersicht der Teamleitung */
export interface TeamAppointment {
  id: string;
  leadId: string | null;
  leadName: string;
  /** Zeitpunkt, an dem der Termin im Cockpit gebucht wurde */
  bookedAt: string;
  hunterName: string;
  assistantName: string;
  /** Übertragung des Anrufprotokolls nach Salesforce */
  status: SyncStatus;
  /** True, wenn der Termin in diesem Browser erfasst wurde */
  live: boolean;
}

/** Live-Termine aus diesem Browser mit dem Status ihres Anrufprotokolls in Salesforce */
export function liveTeamAppointments(
  booked: readonly {
    id: string;
    leadId: string;
    leadName: string;
    owner: string | null;
    recordedAt: string;
  }[],
  syncStatus: ReadonlyMap<string, SyncStatus>,
  assistantName: string,
): TeamAppointment[] {
  return booked.map((entry) => ({
    id: entry.id,
    leadId: entry.leadId,
    leadName: entry.leadName,
    bookedAt: entry.recordedAt,
    hunterName: entry.owner ?? 'nicht zugeordnet',
    assistantName,
    status: syncStatus.get(entry.id) ?? 'pending',
    live: true,
  }));
}

/** Neueste zuerst */
export function sortTeamAppointments(rows: readonly TeamAppointment[]): TeamAppointment[] {
  return [...rows].sort((a, b) => b.bookedAt.localeCompare(a.bookedAt));
}

/** Gebucht am angegebenen Tag (YYYY-MM-DD, Ortszeit) */
export function bookedOn(row: Pick<TeamAppointment, 'bookedAt'>, day: string): boolean {
  const date = new Date(row.bookedAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` === day;
}

/** Zeitraum der Terminliste in der Führungsansicht */
export type AppointmentFilter = 'today' | 'week';

/** Heute gebuchte oder alle Termine der Woche; today als YYYY-MM-DD */
export function filterAppointments(
  appointments: readonly TeamAppointment[],
  filter: AppointmentFilter,
  today: string,
): TeamAppointment[] {
  return filter === 'today'
    ? appointments.filter((row) => bookedOn(row, today))
    : [...appointments];
}
