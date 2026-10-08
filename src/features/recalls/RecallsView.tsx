import { useMemo } from 'react';
import { todayLocal, useQueue } from '@/app/selectors';
import { salesforceUrl } from '@/app/services';
import { useAppStore } from '@/app/store';
import { Button } from '@/components/Button';
import { formatDay, formatInt } from '@/components/format';
import { LINK_SECONDARY } from '@/components/linkStyles';
import { Panel } from '@/components/Panel';
import { StatTile } from '@/components/StatTile';
import {
  RECALL_BUCKETS,
  RECALL_BUCKET_LABELS,
  recallBucket,
  recallReasonText,
} from '@/domain/recall';
import { tasksUrl } from '@/domain/salesforce';
import type { Recall } from '@/domain/types';
import { useOpenRecalls, useTaskLink } from './useRecalls';

/**
 * Wiedervorlagen der Telefonassistenz: vereinbarte Rückrufe und Vertragsenden aus den
 * Gesprächen, fällige zuerst. Ein Klick öffnet den Account in der Anrufliste.
 */
export function RecallsView() {
  const recalls = useOpenRecalls();
  const queue = useQueue();
  const selectLead = useAppStore((s) => s.selectLead);
  const setTab = useAppStore((s) => s.setTab);
  const today = todayLocal();
  const inQueue = useMemo(() => new Set(queue.map((entry) => entry.lead.id)), [queue]);
  const groups = RECALL_BUCKETS.map((bucket) => ({
    bucket,
    items: recalls.filter((recall) => recallBucket(recall.dueDate, today) === bucket),
  }));
  const count = (bucket: string) => groups.find((group) => group.bucket === bucket)?.items.length;
  const notInSalesforce = recalls.filter((recall) => !recall.salesforceOpenedAt).length;

  function call(leadId: string) {
    selectLead(leadId);
    setTab('queue');
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Wiedervorlagen</h2>
            <p className="text-sm text-muted">
              Vereinbarte Rückrufe und Vertragsenden aus deinen Gesprächen, fällige zuerst.
            </p>
          </div>
          {salesforceUrl && (
            <a
              href={tasksUrl(salesforceUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_SECONDARY}
            >
              Aufgaben in Salesforce öffnen
            </a>
          )}
        </header>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label="Heute fällig" value={formatInt(count('today') ?? 0)} />
          <StatTile label="Überfällig" value={formatInt(count('overdue') ?? 0)} />
          <StatTile label="Offen gesamt" value={formatInt(recalls.length)} />
          <StatTile label="Noch nicht in Salesforce" value={formatInt(notInSalesforce)} />
        </div>

        {recalls.length === 0 ? (
          <Panel>
            <p className="text-sm text-muted">
              Keine offenen Wiedervorlagen. In der Anrufliste plant Taste 2 eine Wiedervorlage mit
              Datum.
            </p>
          </Panel>
        ) : (
          groups
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <Panel
                key={group.bucket}
                title={`${RECALL_BUCKET_LABELS[group.bucket]} (${group.items.length})`}
              >
                <ul
                  aria-label={`Wiedervorlagen ${RECALL_BUCKET_LABELS[group.bucket]}`}
                  className="-my-2 divide-y divide-border"
                >
                  {group.items.map((recall) => (
                    <RecallRow
                      key={recall.id}
                      recall={recall}
                      due={group.bucket === 'overdue' || group.bucket === 'today'}
                      callable={inQueue.has(recall.leadId)}
                      onCall={() => call(recall.leadId)}
                    />
                  ))}
                </ul>
              </Panel>
            ))
        )}
      </div>
    </div>
  );
}

interface RecallRowProps {
  recall: Recall;
  due: boolean;
  /** Account steht in der aktuellen Potenzialliste */
  callable: boolean;
  onCall(): void;
}

function RecallRow({ recall, due, callable, onCall }: RecallRowProps) {
  const { href, markOpened } = useTaskLink(recall);
  const opened = recall.salesforceOpenedAt;
  const reason = recallReasonText(recall);

  return (
    <li className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-[9rem_1fr_auto] sm:items-center">
      <div className={due ? 'text-brand-primary' : undefined}>
        <div className="text-sm font-bold tabular-nums">{formatDay(recall.dueDate)}</div>
        <div className="text-xs tabular-nums text-muted">
          {recall.dueTime ? `${recall.dueTime} Uhr` : 'ganztägig'}
        </div>
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-bold">{recall.leadName}</div>
        <div className="text-xs text-muted">
          {reason}
          {recall.hunterName && ` · Hunter ${recall.hunterName}`}
        </div>
        {recall.note && <div className="mt-1 text-sm">{recall.note}</div>}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <span
          className={`rounded border px-2 py-0.5 text-xs font-bold ${
            opened ? 'border-border text-muted' : 'border-brand-primary text-brand-primary'
          }`}
        >
          {opened ? 'In Salesforce' : 'Noch nicht in Salesforce'}
        </span>
        {href && !opened && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={markOpened}
            className={LINK_SECONDARY}
          >
            In Salesforce anlegen
          </a>
        )}
        <Button
          variant={due ? 'primary' : 'secondary'}
          onClick={onCall}
          disabled={!callable}
          title={callable ? undefined : 'Nicht in der aktuellen Potenzialliste'}
        >
          Anrufen
        </Button>
      </div>
    </li>
  );
}
