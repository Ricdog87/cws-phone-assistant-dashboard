import { formatDay } from '@/components/format';
import { LINK_PRIMARY, LINK_SECONDARY } from '@/components/linkStyles';
import { recallReasonText } from '@/domain/recall';
import type { Recall } from '@/domain/types';
import { useTaskLink } from './useRecalls';

/** Fälligkeit mit Uhrzeit und Grund in einer Zeile */
function recallWhen(recall: Recall): string {
  const time = recall.dueTime ? `, ${recall.dueTime} Uhr` : '';
  return `${formatDay(recall.dueDate)}${time} · ${recallReasonText(recall)}`;
}

/** Wiedervorlage im Briefing: Fälligkeit, Notiz und Aufgabe in Salesforce */
export function RecallTask({ recall }: { recall: Recall }) {
  const { href, listHref, markOpened } = useTaskLink(recall);
  const opened = recall.salesforceOpenedAt;

  return (
    <section
      aria-label="Wiedervorlage in Salesforce"
      className="rounded border-2 border-brand-ink bg-panel p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Wiedervorlage</h3>
        <span
          className={`rounded border px-2 py-0.5 text-xs font-bold ${
            opened ? 'border-border text-muted' : 'border-brand-primary text-brand-primary'
          }`}
        >
          {opened ? 'Aufgabe in Salesforce angelegt' : 'Noch nicht in Salesforce'}
        </span>
      </div>
      <p className="mt-2 text-sm font-bold">{recallWhen(recall)}</p>
      {recall.note && <p className="mt-1 text-sm">{recall.note}</p>}
      {href ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={markOpened}
            className={opened ? LINK_SECONDARY : LINK_PRIMARY}
          >
            Aufgabe in Salesforce anlegen
          </a>
          {listHref && (
            <a href={listHref} target="_blank" rel="noopener noreferrer" className={LINK_SECONDARY}>
              Aufgaben in Salesforce öffnen
            </a>
          )}
        </div>
      ) : (
        <p role="note" className="mt-3 text-sm font-bold text-brand-primary">
          Salesforce-Adresse ist nicht hinterlegt (VITE_SALESFORCE_URL).
        </p>
      )}
    </section>
  );
}
