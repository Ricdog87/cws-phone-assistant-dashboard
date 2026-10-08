import type { Appointment } from './types';

/** Jüngster Eintrag je Lead */
export function latestAppointmentByLead(
  appointments: readonly Appointment[],
): Map<string, Appointment> {
  const latest = new Map<string, Appointment>();
  for (const appointment of appointments) {
    const current = latest.get(appointment.leadId);
    if (!current || appointment.createdAt >= current.createdAt) {
      latest.set(appointment.leadId, appointment);
    }
  }
  return latest;
}

/** Termin in der Übersicht der Teamleitung */
export interface TeamAppointment {
  id: string;
  leadId: string | null;
  leadName: string;
  /** Zeitpunkt, an dem der Termin im Cockpit gebucht wurde */
  bookedAt: string;
  hunterName: string;
  assistantName: string;
  status: 'entered' | 'open';
  /** True, wenn der Termin in diesem Browser erfasst wurde */
  live: boolean;
}

export const TEAM_APPOINTMENT_STATUS_LABELS: Record<TeamAppointment['status'], string> = {
  entered: 'In Salesforce eingetragen',
  open: 'Noch nicht in Salesforce',
};

/**
 * Live-Termine aus diesem Browser: jeder gebuchte Termin, eingetragen, sobald das
 * Salesforce-Formular über das Cockpit geöffnet wurde.
 */
export function liveTeamAppointments(
  appointments: readonly Appointment[],
  booked: readonly {
    id: string;
    leadId: string;
    leadName: string;
    owner: string | null;
    recordedAt: string;
  }[],
  assistantName: string,
): TeamAppointment[] {
  const latest = latestAppointmentByLead(appointments);
  return booked.map((entry) => {
    const opened = latest.get(entry.leadId)?.salesforceOpenedAt;
    return {
      id: entry.id,
      leadId: entry.leadId,
      leadName: entry.leadName,
      bookedAt: entry.recordedAt,
      hunterName: entry.owner ?? 'nicht zugeordnet',
      assistantName,
      status: opened ? 'entered' : 'open',
      live: true,
    };
  });
}

/** Offene zuerst, dann nach Buchungszeitpunkt, neueste oben */
export function sortTeamAppointments(rows: readonly TeamAppointment[]): TeamAppointment[] {
  return [...rows].sort(
    (a, b) =>
      Number(a.status === 'entered') - Number(b.status === 'entered') ||
      b.bookedAt.localeCompare(a.bookedAt),
  );
}
