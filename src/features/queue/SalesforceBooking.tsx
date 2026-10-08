import { LINK_PRIMARY as PRIMARY, LINK_SECONDARY as SECONDARY } from '@/components/linkStyles';
import { salesforceObjectOf } from '@/domain/salesforce';
import type { Lead } from '@/domain/types';
import { useEventBooking } from './useEventBooking';

interface SalesforceBookingProps {
  lead: Lead;
  /** Name der Telefonassistenz für die Beschreibung des Termins */
  callerName: string;
  /** Salesforce-Oberfläche, null, wenn nicht hinterlegt */
  salesforceUrl: string | null;
}

/**
 * Terminvergabe direkt in Salesforce: ein Klick öffnet das Formular „Neuer Termin“ mit
 * Betreff und Bezug zum Account. Datum, Uhrzeit und Einladung entstehen in Salesforce.
 */
export function SalesforceBooking({ lead, callerName, salesforceUrl }: SalesforceBookingProps) {
  const { eventHref, calendarHref, recordHref, saved, markOpened } = useEventBooking(
    lead,
    callerName,
    salesforceUrl,
  );
  const linked = salesforceObjectOf(lead.id) !== null;
  const links =
    eventHref && calendarHref
      ? { event: eventHref, calendar: calendarHref, record: recordHref }
      : null;

  const opened = saved?.salesforceOpenedAt;

  return (
    <section
      aria-label="Termin in Salesforce eintragen"
      className="rounded border-2 border-brand-primary bg-panel p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted">
          Termin in Salesforce eintragen
        </h3>
        <span
          className={`rounded border px-2 py-0.5 text-xs font-bold ${
            opened ? 'border-border text-muted' : 'border-brand-primary text-brand-primary'
          }`}
        >
          {opened ? 'In Salesforce eingetragen' : 'Noch nicht in Salesforce'}
        </span>
      </div>

      <p className="mt-2 text-sm">
        Datum, Uhrzeit und Einladung legst du direkt im Salesforce-Kalender an. Betreff
        {linked ? ' und Account sind' : ' ist'} vorausgefüllt
        {lead.owner ? `, Hunter: ${lead.owner}` : ''}.
      </p>

      {links ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={links.event}
            target="_blank"
            rel="noopener noreferrer"
            onClick={markOpened}
            className={PRIMARY}
          >
            Termin in Salesforce anlegen
          </a>
          <a href={links.calendar} target="_blank" rel="noopener noreferrer" className={SECONDARY}>
            Salesforce-Kalender öffnen
          </a>
          {links.record && (
            <a href={links.record} target="_blank" rel="noopener noreferrer" className={SECONDARY}>
              Account in Salesforce öffnen
            </a>
          )}
        </div>
      ) : (
        <p role="note" className="mt-3 text-sm font-bold text-brand-primary">
          Salesforce-Adresse ist nicht hinterlegt (VITE_SALESFORCE_URL).
        </p>
      )}

      {opened && (
        <p className="mt-2 text-xs text-muted">
          Salesforce geöffnet am {new Date(opened).toLocaleString('de-DE')}
        </p>
      )}
      {links && !linked && (
        <p className="mt-2 text-xs text-muted">
          Demo-Daten haben keine Salesforce-ID. Den Account im Formular unter „Bezug zu“ wählen.
        </p>
      )}
    </section>
  );
}
