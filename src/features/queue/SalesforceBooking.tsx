import { LINK_PRIMARY, LINK_SECONDARY } from '@/components/linkStyles';
import type { Lead } from '@/domain/types';
import { useEventBooking } from './useEventBooking';

interface SalesforceBookingProps {
  lead: Lead;
  /** Salesforce-Oberfläche, null, wenn nicht hinterlegt */
  salesforceUrl: string | null;
}

/**
 * Termin im Salesforce-Kalender: „Termin vereinbaren“ öffnet die Wochenansicht, dort
 * entstehen Datum, Uhrzeit, Hunter und Einladung. Hier lässt sich der Kalender erneut öffnen.
 */
export function SalesforceBooking({ lead, salesforceUrl }: SalesforceBookingProps) {
  const { calendarHref, recordHref, saved, markOpened } = useEventBooking(lead, salesforceUrl);
  const opened = saved?.salesforceOpenedAt;

  return (
    <section
      aria-label="Termin in Salesforce eintragen"
      className="rounded border-2 border-brand-primary bg-panel p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted">
          Termin im Salesforce-Kalender
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
        Datum, Uhrzeit und Einladung trägst du im Salesforce-Kalender ein
        {lead.owner ? `, Hunter: ${lead.owner}` : ''}.
      </p>

      {calendarHref ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={calendarHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={markOpened}
            className={opened ? LINK_SECONDARY : LINK_PRIMARY}
          >
            Salesforce-Kalender öffnen
          </a>
          {recordHref && (
            <a
              href={recordHref}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_SECONDARY}
            >
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
          Salesforce-Kalender geöffnet am {new Date(opened).toLocaleString('de-DE')}
        </p>
      )}
    </section>
  );
}
