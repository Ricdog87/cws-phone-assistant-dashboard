import { useSyncStatus } from '@/app/selectors';
import { formatDay } from '@/components/format';
import { SyncBadge } from '@/components/SyncBadge';
import { recallReasonText } from '@/domain/recall';
import type { Recall } from '@/domain/types';

/** Fälligkeit mit Uhrzeit und Grund in einer Zeile */
function recallWhen(recall: Recall): string {
  const time = recall.dueTime ? `, ${recall.dueTime} Uhr` : '';
  return `${formatDay(recall.dueDate)}${time} · ${recallReasonText(recall)}`;
}

/** Wiedervorlage im Briefing: Fälligkeit, Notiz und Status der Aufgabe in Salesforce */
export function RecallTask({ recall }: { recall: Recall }) {
  const syncStatus = useSyncStatus();
  return (
    <section aria-label="Wiedervorlage" className="rounded border-2 border-brand-ink bg-panel p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Wiedervorlage</h3>
        <SyncBadge status={syncStatus(recall.id)} />
      </div>
      <p className="mt-2 text-sm font-bold">{recallWhen(recall)}</p>
      {recall.note && <p className="mt-1 text-sm">{recall.note}</p>}
    </section>
  );
}
