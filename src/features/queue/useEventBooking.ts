import { useMemo } from 'react';
import { newId } from '@/app/ids';
import { todayLocal } from '@/app/selectors';
import { salesforceUrl } from '@/app/services';
import { useAppStore } from '@/app/store';
import { latestAppointmentByLead } from '@/domain/appointments';
import { calendarUrl, recordUrl } from '@/domain/salesforce';
import type { Appointment, Lead } from '@/domain/types';

/** Salesforce-Kalender in der Wochenansicht ab heute, null ohne Salesforce-Adresse */
export function salesforceCalendarHref(base: string | null = salesforceUrl): string | null {
  return base ? calendarUrl(base, todayLocal()) : null;
}

/** Öffnet den Salesforce-Kalender in einem neuen Tab; false ohne Salesforce-Adresse */
export function openSalesforceCalendar(base: string | null = salesforceUrl): boolean {
  const href = salesforceCalendarHref(base);
  if (!href) return false;
  window.open(href, '_blank', 'noopener,noreferrer');
  return true;
}

export interface EventBooking {
  /** Salesforce-Kalender in der Wochenansicht ab heute */
  calendarHref: string | null;
  /** Account oder Lead in Salesforce, nur mit echter Salesforce-ID */
  recordHref: string | null;
  saved: Appointment | undefined;
  /** Merkt sich, dass der Salesforce-Kalender über das Cockpit geöffnet wurde */
  markOpened(): void;
}

/** Termin im Salesforce-Kalender eintragen; base ist die Salesforce-Oberfläche */
export function useEventBooking(lead: Lead, base: string | null = salesforceUrl): EventBooking {
  const appointments = useAppStore((s) => s.appointments);
  const addAppointment = useAppStore((s) => s.addAppointment);
  const saved = useMemo(
    () => latestAppointmentByLead(appointments).get(lead.id),
    [appointments, lead.id],
  );

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
    calendarHref: salesforceCalendarHref(base),
    recordHref: base ? recordUrl(base, lead.id) : null,
    saved,
    markOpened,
  };
}
