import { useCallback, useEffect, useState } from 'react';
import { useLatestOutcomes, useQueue } from '@/app/selectors';
import { useAppStore } from '@/app/store';
import { OUTCOME_TYPES } from '@/domain/outcomes';
import type { OutcomeType } from '@/domain/types';
import { BriefingPanel } from './BriefingPanel';
import { QueueList } from './QueueList';
import { useRecordOutcome } from './useRecordOutcome';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName);
}

export function QueueView() {
  const queue = useQueue();
  const latest = useLatestOutcomes();
  const selectedId = useAppStore((s) => s.selectedLeadId);
  const selectLead = useAppStore((s) => s.selectLead);
  const recordOutcome = useRecordOutcome(queue);
  const [busy, setBusy] = useState(false);

  const selectedIndex = queue.findIndex((e) => e.lead.id === selectedId);
  const selected = selectedIndex >= 0 ? queue[selectedIndex] : undefined;
  const openCount = queue.filter((e) => !latest.has(e.lead.id)).length;

  // Ohne gültige Auswahl den ersten offenen Lead wählen
  useEffect(() => {
    if (selected || queue.length === 0) return;
    const firstOpen = queue.find((e) => !latest.has(e.lead.id)) ?? queue[0];
    if (firstOpen) selectLead(firstOpen.lead.id);
  }, [selected, queue, latest, selectLead]);

  const book = useCallback(
    async (outcome: OutcomeType) => {
      if (!selected || busy) return;
      setBusy(true);
      try {
        await recordOutcome(selected, outcome);
      } finally {
        setBusy(false);
      }
    },
    [selected, busy, recordOutcome],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (queue.length === 0) return;
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        const base = selectedIndex < 0 ? 0 : selectedIndex + delta;
        const next = queue[Math.max(0, Math.min(queue.length - 1, base))];
        if (next) selectLead(next.lead.id);
        return;
      }
      const index = ['1', '2', '3', '4'].indexOf(event.key);
      const outcome = OUTCOME_TYPES[index];
      if (outcome) {
        event.preventDefault();
        void book(outcome);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [queue, selectedIndex, selectLead, book]);

  return (
    <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[minmax(320px,2fr)_3fr]">
      <aside className="flex min-h-0 flex-col border-r border-border bg-panel">
        <div className="flex items-baseline justify-between border-b border-border px-3 py-2">
          <h2 className="text-sm font-bold">Warteschlange</h2>
          <span className="text-xs text-muted">
            {openCount} offen von {queue.length}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <QueueList queue={queue} selectedId={selectedId} latest={latest} onSelect={selectLead} />
        </div>
      </aside>
      <div className="min-h-0 overflow-y-auto p-6">
        {selected ? (
          <BriefingPanel
            entry={selected}
            latest={latest.get(selected.lead.id)}
            busy={busy}
            onRecord={(o) => void book(o)}
          />
        ) : (
          <p className="text-sm text-muted">Kein Lead ausgewählt.</p>
        )}
      </div>
    </div>
  );
}
