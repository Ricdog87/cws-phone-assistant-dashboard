import { useMemo } from 'react';
import { todayLocal, useQueue, useSyncStatus } from '@/app/selectors';
import { useAppStore } from '@/app/store';
import { Button } from '@/components/Button';
import { formatDay, formatInt } from '@/components/format';
import { Panel } from '@/components/Panel';
import { StatTile } from '@/components/StatTile';
import { SyncBadge } from '@/components/SyncBadge';
import {
  RECALL_BUCKETS,
  RECALL_BUCKET_LABELS,
  recallBucket,
  recallReasonText,
  type RecallBucket,
} from '@/domain/recall';
import type { SyncStatus } from '@/domain/salesforceSync';
import type { Recall } from '@/domain/types';
import { useOpenRecalls } from './useRecalls';

/**
 * Wiedervorlagen der Telefonassistenz: vereinbarte Rückrufe und Vertragsenden aus den
 * Gesprächen, fällige zuerst. Jede Wiedervorlage geht automatisch als Aufgabe nach
 * Salesforce; „Anrufen“ öffnet den Account in der Anrufliste.
 */
export function RecallsView() {
  const recalls = useOpenRecalls();
  const queue = useQueue();
  const syncStatus = useSyncStatus();
  const selectLead = useAppStore((s) => s.selectLead);
  const setTab = useAppStore((s) => s.setTab);
  const today = todayLocal();
  const inQueue = useMemo(() => new Set(queue.map((entry) => entry.lead.id)), [queue]);
  const groups = RECALL_BUCKETS.map((bucket) => ({
    bucket,
    items: recalls.filter((recall) => recallBucket(recall.dueDate, today) === bucket),
  }));
  const count = (bucket: RecallBucket) =>
    groups.find((group) => group.bucket === bucket)?.items.length ?? 0;

  function call(leadId: string) {
    selectLead(leadId);
    setTab('queue');
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <header>
          <h2 className="text-lg font-bold">Wiedervorlagen</h2>
          <p className="text-sm text-muted">
            Vereinbarte Rückrufe und Vertragsenden aus deinen Gesprächen, fällige zuerst. Jede
            Wiedervorlage steht automatisch als Aufgabe in Salesforce.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label="Heute fällig" value={formatInt(count('today'))} />
          <StatTile label="Überfällig" value={formatInt(count('overdue'))} />
          <StatTile label="Nächste 7 Tage" value={formatInt(count('soon'))} />
          <StatTile label="Offen gesamt" value={formatInt(recalls.length)} />
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
                      status={syncStatus(recall.id)}
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
  status: SyncStatus;
  due: boolean;
  /** Account steht in der aktuellen Potenzialliste */
  callable: boolean;
  onCall(): void;
}

function RecallRow({ recall, status, due, callable, onCall }: RecallRowProps) {
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
          {recallReasonText(recall)}
          {recall.hunterName && ` · Hunter ${recall.hunterName}`}
        </div>
        {recall.note && <div className="mt-1 text-sm">{recall.note}</div>}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <SyncBadge status={status} />
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
