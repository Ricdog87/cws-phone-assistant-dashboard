import { useEffect, useRef } from 'react';
import { BandBadge } from '@/components/BandBadge';
import { ControlTag } from '@/components/ControlTag';
import { formatMin } from '@/components/format';
import { OUTCOME_LABELS } from '@/domain/outcomes';
import type { CallOutcome, QueueEntry } from '@/domain/types';

interface QueueListProps {
  queue: readonly QueueEntry[];
  selectedId: string | null;
  latest: ReadonlyMap<string, CallOutcome>;
  onSelect(id: string): void;
}

export function QueueList({ queue, selectedId, latest, onSelect }: QueueListProps) {
  const selectedRef = useRef<HTMLLIElement>(null);

  // Ausgewählten Lead bei Tastaturnavigation im sichtbaren Bereich halten
  useEffect(() => {
    selectedRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [selectedId]);

  if (queue.length === 0) {
    return <p className="p-4 text-sm text-muted">Keine Leads im Korridor.</p>;
  }

  return (
    <ul role="listbox" aria-label="Warteschlange" className="divide-y divide-border">
      {queue.map((entry) => {
        const selected = entry.lead.id === selectedId;
        const outcome = latest.get(entry.lead.id);
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
                {outcome && ` · ${OUTCOME_LABELS[outcome.outcome]}`}
              </div>
            </div>
            <div className="text-right text-xs tabular-nums text-muted">
              {formatMin(entry.detourMinutes)}
            </div>
            <div className="w-8 text-right text-sm font-bold tabular-nums">{entry.score}</div>
          </li>
        );
      })}
    </ul>
  );
}
