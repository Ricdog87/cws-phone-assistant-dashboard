import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEMO_USER } from '@/app/demoUser';
import { todayLocal, useCooldownCount, useLatestOutcomes, useQueue } from '@/app/selectors';
import { useAppStore } from '@/app/store';
import { ACTIVITY_COOLDOWN_DAYS } from '@/domain/activity';
import { openCallFor } from '@/domain/openCalls';
import { emptyProtocol, sameProtocol } from '@/domain/protocol';
import type { CallProtocol, OutcomeType } from '@/domain/types';
import { useOpenRecalls } from '@/features/recalls/useRecalls';
import { AgentLivePanel } from './AgentLivePanel';
import { BriefingPanel } from './BriefingPanel';
import { QueueList } from './QueueList';
import { HunterSelect } from './HunterSelect';
import { OutcomeBar } from './OutcomeBar';
import { KEYED_OUTCOMES } from './outcomeKeys';
import { useRecordOutcome, type RecallDraft } from './useRecordOutcome';
import { useSaveProtocol } from './useSaveProtocol';

const EMPTY_PROTOCOL = emptyProtocol();

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
  const saveProtocol = useSaveProtocol();
  const syncItems = useAppStore((s) => s.syncItems);
  const openCalls = useAppStore((s) => s.openCalls);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  // Lead, für den gerade die Wiedervorlage geplant wird
  const [planningFor, setPlanningFor] = useState<string | null>(null);

  const selectedIndex = queue.findIndex((e) => e.lead.id === selectedId);
  const selected = selectedIndex >= 0 ? queue[selectedIndex] : undefined;
  const planning = selected !== undefined && planningFor === selected.lead.id;
  const selectedLeadId = selected?.lead.id;
  // Gespeichertes Protokoll des offenen Gesprächs, darüber ungespeicherte Eingaben je Lead
  const openCall = selectedLeadId ? openCallFor(openCalls, selectedLeadId) : undefined;
  const savedProtocol = openCall?.protocol ?? EMPTY_PROTOCOL;
  const [drafts, setDrafts] = useState<ReadonlyMap<string, CallProtocol>>(() => new Map());
  const protocol = (selectedLeadId ? drafts.get(selectedLeadId) : undefined) ?? savedProtocol;
  const dirty = !sameProtocol(protocol, savedProtocol);
  const setProtocol = useCallback(
    (next: CallProtocol) => {
      if (selectedLeadId) setDrafts((prev) => new Map(prev).set(selectedLeadId, next));
    },
    [selectedLeadId],
  );
  /** Entwurf verwerfen; mit expected nur, wenn seither nichts mehr eingegeben wurde */
  const dropDraft = useCallback((leadId: string, expected?: CallProtocol) => {
    setDrafts((prev) => {
      if (!prev.has(leadId) || (expected && prev.get(leadId) !== expected)) return prev;
      const next = new Map(prev);
      next.delete(leadId);
      return next;
    });
  }, []);
  const statusOf = useCallback(
    (id: string) => syncItems.find((item) => item.id === id)?.status,
    [syncItems],
  );
  const latestOutcome = selectedLeadId ? latest.get(selectedLeadId) : undefined;
  const latestSync = latestOutcome ? statusOf(latestOutcome.id) : undefined;
  const saved = openCall ? { savedAt: openCall.savedAt, status: statusOf(openCall.id) } : null;
  const recalls = useOpenRecalls();
  const recallByLead = useMemo(
    () => new Map(recalls.map((recall) => [recall.leadId, recall])),
    [recalls],
  );
  const openRecall = selected ? recallByLead.get(selected.lead.id) : undefined;
  const openCount = queue.filter((e) => !latest.has(e.lead.id)).length;
  const blocked = useCooldownCount();

  // Ohne gültige Auswahl den ersten offenen Lead wählen
  useEffect(() => {
    if (selected || queue.length === 0) return;
    const firstOpen = queue.find((e) => !latest.has(e.lead.id)) ?? queue[0];
    if (firstOpen) selectLead(firstOpen.lead.id);
  }, [selected, queue, latest, selectLead]);

  const book = useCallback(
    async (outcome: OutcomeType, recall?: RecallDraft) => {
      if (!selected || busy) return;
      // Wiedervorlage erst nach Datum und Grund buchen
      if (outcome === 'callback' && !recall) {
        setPlanningFor(selected.lead.id);
        return;
      }
      setBusy(true);
      try {
        await recordOutcome(selected, outcome, { recall, protocol });
        dropDraft(selected.lead.id);
        setPlanningFor(null);
      } finally {
        setBusy(false);
      }
    },
    [selected, busy, recordOutcome, protocol, dropDraft],
  );

  const save = useCallback(async () => {
    if (!selected || !dirty || saving || busy) return;
    setSaving(true);
    try {
      await saveProtocol(selected, protocol);
      dropDraft(selected.lead.id, protocol);
    } finally {
      setSaving(false);
    }
  }, [selected, dirty, saving, busy, saveProtocol, protocol, dropDraft]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Strg+Enter speichert das Protokoll, auch mitten in der Notiz
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        void save();
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) return;
      if (planning) {
        if (event.key === 'Escape') setPlanningFor(null);
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (queue.length === 0) return;
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        const base = selectedIndex < 0 ? 0 : selectedIndex + delta;
        const next = queue[Math.max(0, Math.min(queue.length - 1, base))];
        if (next) selectLead(next.lead.id);
        return;
      }
      const outcome = KEYED_OUTCOMES[['1', '2', '3'].indexOf(event.key)];
      if (outcome) {
        event.preventDefault();
        void book(outcome);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [queue, selectedIndex, selectLead, book, save, planning]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AgentLivePanel />
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(320px,2fr)_3fr]">
        <aside className="flex min-h-0 flex-col border-r border-border bg-panel">
          <div className="space-y-2 border-b border-border px-3 py-2">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-bold">Warteschlange</h2>
              <span className="text-xs text-muted">
                {openCount} offen von {queue.length}
                {blocked > 0 && (
                  <span title={`Letzte Aktivität vor weniger als ${ACTIVITY_COOLDOWN_DAYS} Tagen`}>
                    {' '}
                    · {blocked} in Sperrfrist
                  </span>
                )}
              </span>
            </div>
            <HunterSelect />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <QueueList
              queue={queue}
              selectedId={selectedId}
              latest={latest}
              recalls={recallByLead}
              today={todayLocal()}
              onSelect={selectLead}
            />
          </div>
        </aside>
        <div className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {selected ? (
              <BriefingPanel entry={selected} callerName={DEMO_USER.fullName} />
            ) : (
              <p className="text-sm text-muted">Kein Lead ausgewählt.</p>
            )}
          </div>
          {selected && (
            <OutcomeBar
              leadName={selected.lead.name}
              latest={latest.get(selected.lead.id)}
              latestSync={latestSync}
              recall={openRecall}
              protocol={protocol}
              onProtocolChange={setProtocol}
              saved={saved}
              dirty={dirty}
              saving={saving}
              onProtocolSave={() => void save()}
              busy={busy}
              planning={planning}
              today={new Date()}
              onRecord={(o) => void book(o)}
              onRecallSave={(draft) => void book('callback', draft)}
              onRecallCancel={() => setPlanningFor(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
