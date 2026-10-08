import { todayLocal } from '@/app/selectors';
import { salesforceUrl } from '@/app/services';
import { calendarUrl } from '@/domain/salesforce';

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
