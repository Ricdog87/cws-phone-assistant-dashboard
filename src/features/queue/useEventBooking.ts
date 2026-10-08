import { useMemo } from 'react';
import { newId } from '@/app/ids';
import { salesforceUrl } from '@/app/services';
import { useAppStore } from '@/app/store';
import { eventDescription, eventSubject, latestAppointmentByLead } from '@/domain/appointments';
import { latestContactByLead } from '@/domain/contacts';
import { calendarUrl, newEventUrl, recordUrl } from '@/domain/salesforce';
import type { Appointment, Lead } from '@/domain/types';

export interface EventBooking {
  /** Formular „Neuer Termin“, null ohne hinterlegte Salesforce-Adresse */
  eventHref: string | null;
  calendarHref: string | null;
  /** Account oder Lead in Salesforce, nur mit echter Salesforce-ID */
  recordHref: string | null;
  saved: Appointment | undefined;
  /** Merkt sich, dass das Salesforce-Formular über das Cockpit geöffnet wurde */
  markOpened(): void;
}

/**
 * Terminvergabe direkt in Salesforce: Link auf das Formular mit Betreff, Bezug und
 * Beschreibung. base ist die Salesforce-Oberfläche, Standard aus VITE_SALESFORCE_URL.
 */
export function useEventBooking(
  lead: Lead,
  callerName: string,
  base: string | null = salesforceUrl,
): EventBooking {
  const appointments = useAppStore((s) => s.appointments);
  const contacts = useAppStore((s) => s.contacts);
  const addAppointment = useAppStore((s) => s.addAppointment);
  const saved = useMemo(
    () => latestAppointmentByLead(appointments).get(lead.id),
    [appointments, lead.id],
  );
  const contact = useMemo(() => latestContactByLead(contacts).get(lead.id), [contacts, lead.id]);

  function markOpened() {
    const now = new Date().toISOString();
    void addAppointment({
      id: saved?.id ?? newId(),
      leadId: lead.id,
      leadName: lead.name,
      hunterName: lead.owner ?? null,
      createdAt: saved?.createdAt ?? now,
      salesforceOpenedAt: now,
    });
  }

  return {
    eventHref: base
      ? newEventUrl(base, {
          subject: eventSubject(lead.name),
          recordId: lead.id,
          description: eventDescription({
            assistantName: callerName,
            hunterName: lead.owner ?? null,
            contactName: contact?.name ?? lead.contactName,
          }),
        })
      : null,
    calendarHref: base ? calendarUrl(base) : null,
    recordHref: base ? recordUrl(base, lead.id) : null,
    saved,
    markOpened,
  };
}
