import { useEffect, useRef } from 'react';
import { BandBadge } from '@/components/BandBadge';
import { ControlTag } from '@/components/ControlTag';
import { activityLabel, daysSinceActivity } from '@/domain/activity';
import { OUTCOME_LABELS } from '@/domain/outcomes';
import type { MarketRow } from '@/domain/market';
import { PROTOCOL_FLAG_LABELS, protocolFlags } from '@/domain/protocol';
import { formatMonth } from '@/domain/recall';
import type { CallOutcome, QueueEntry, Recall } from '@/domain/types';

interface QueueListProps {
  queue: readonly QueueEntry[];
  selectedId: string | null;
  latest: ReadonlyMap<string, CallOutcome>;
  /** Offene Wiedervorlagen je Lead */
  recalls?: ReadonlyMap<string, Recall>;
  /** Bekannter Stand je Lead aus früheren Gesprächen, für Wettbewerber und Vertragsende */
  known?: ReadonlyMap<string, MarketRow>;
  /** Heute als YYYY-MM-DD für die Anzeige der letzten Aktivität */
  today: string;
  onSelect(id: string): void;
}

export function QueueList({
  queue,
  selectedId,
  latest,
  recalls,
  known,
  today,
  onSelect,
}: QueueListProps) {
  const selectedRef = useRef<HTMLLIElement>(null);

  // Ausgewählten Lead bei Tastaturnavigation im sichtbaren Bereich halten
  useEffect(() => {
    selectedRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [selectedId]);

  if (queue.length === 0) {
    return (
      <p className="p-4 text-sm text-muted">Keine offenen Accounts in dieser Potenzialliste.</p>
    );
  }

  return (
    <ul role="listbox" aria-label="Warteschlange" className="divide-y divide-border">
      {queue.map((entry) => {
        const selected = entry.lead.id === selectedId;
        const outcome = latest.get(entry.lead.id);
        const recall = recalls?.get(entry.lead.id);
        const knownCall = known?.get(entry.lead.id);
        const competitor = knownCall?.bucket ? knownCall : undefined;
        // Merkmale, die gegen einen weiteren Anruf sprechen, sichtbar machen
        const blockers = protocolFlags(outcome?.protocol).filter(
          (flag) => flag !== 'centralDecision',
        );
        return (
          <li
            key={entry.lead.id}
            ref={selected ? selectedRef : undefined}
            role="option"
            aria-selected={selected}
            onClick={() => onSelect(entry.lead.id)}
            className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${
              selected ? 'bg-surface outline outline-2 -outline-offset-2 outline-brand-ink' : ''
            } ${outcome ? 'opacity-50' : ''}`}
          >
            <span className="w-6 text-right text-xs tabular-nums text-muted">{entry.position}</span>
            <BandBadge band={entry.band} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-bold">{entry.lead.name}</span>
                {entry.isControl && <ControlTag />}
              </div>
              <div className="truncate text-xs text-muted">
                {entry.lead.industry || 'Branche unbekannt'} · {entry.lead.city}
                {outcome && !recall && ` · ${OUTCOME_LABELS[outcome.outcome]}`}
                {blockers.length > 0 && (
                  <span className="font-bold text-brand-primary">
                    {' '}
                    · {blockers.map((flag) => PROTOCOL_FLAG_LABELS[flag]).join(', ')}
                  </span>
                )}
                {recall && (
                  <span
                    className={recall.dueDate <= today ? 'font-bold text-brand-primary' : undefined}
                  >
                    {' '}
                    · Wiedervorlage {shortDate(recall.dueDate)}
                  </span>
                )}
                {competitor && (
                  <span
                    className={
                      competitor.bucket === 'now' ? 'font-bold text-brand-primary' : undefined
                    }
                    title={
                      competitor.followUp
                        ? `Nachfassen ab ${shortDate(competitor.followUp)}`
                        : 'Vertragsende unbekannt'
                    }
                  >
                    {' '}
                    · {competitor.protocol.competitor ?? 'Wettbewerb'}
                    {competitor.protocol.contractEnd &&
                      ` bis ${formatMonth(competitor.protocol.contractEnd)}`}
                  </span>
                )}
              </div>
            </div>
            <div
              className="w-24 text-right text-xs text-muted"
              title={
                entry.lead.lastActivity ? `Letzte Aktivität ${entry.lead.lastActivity}` : undefined
              }
            >
              {activityLabel(daysSinceActivity(entry.lead.lastActivity, today))}
            </div>
            <div className="w-8 text-right text-sm font-bold tabular-nums">{entry.score}</div>
          </li>
        );
      })}
    </ul>
  );
}

/** YYYY-MM-DD als TT.MM. */
function shortDate(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${day}.${month}.`;
}
