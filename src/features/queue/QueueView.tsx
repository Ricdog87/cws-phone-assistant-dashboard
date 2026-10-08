import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEMO_USER } from '@/app/demoUser';
import { todayLocal, useCooldownCount, useLatestOutcomes, useQueue } from '@/app/selectors';
import { useAppStore } from '@/app/store';
import { Button } from '@/components/Button';
import { ACTIVITY_COOLDOWN_DAYS } from '@/domain/activity';
import { OUTCOME_TYPES } from '@/domain/outcomes';
import type { OutcomeType } from '@/domain/types';
import { useOpenRecalls } from '@/features/recalls/useRecalls';
import { AgentLivePanel } from './AgentLivePanel';
import { BriefingPanel } from './BriefingPanel';
import { QueueList } from './QueueList';
import { HunterSelect } from './HunterSelect';
import { OutcomeBar } from './OutcomeBar';
import { openSalesforceCalendar } from './useEventBooking';
import { useRecordOutcome, type RecallDraft } from './useRecordOutcome';

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
  const outcomes = useAppStore((s) => s.outcomes);
  const appointments = useAppStore((s) => s.appointments);
  // Jüngster gebuchter Termin, der noch nicht in Salesforce eingetragen ist
  const pendingConfirmation = useMemo(() => {
    const entered = new Set(appointments.filter((a) => a.salesforceOpenedAt).map((a) => a.leadId));
    return [...outcomes]
      .reverse()
      .find(
        (o) =>
          o.outcome === 'appointment' &&
          !entered.has(o.leadId) &&
          latest.get(o.leadId)?.outcome === 'appointment',
      );
  }, [outcomes, appointments, latest]);
  const [busy, setBusy] = useState(false);
  // Lead, für den gerade die Wiedervorlage geplant wird
  const [planningFor, setPlanningFor] = useState<string | null>(null);

  const selectedIndex = queue.findIndex((e) => e.lead.id === selectedId);
  const selected = selectedIndex >= 0 ? queue[selectedIndex] : undefined;
  const planning = selected !== undefined && planningFor === selected.lead.id;
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
      // Termin vereinbaren öffnet den Salesforce-Kalender, noch in der Bedienhandlung
      const salesforceOpened = outcome === 'appointment' && openSalesforceCalendar();
      setBusy(true);
      try {
        await recordOutcome(selected, outcome, { recall, salesforceOpened });
        setPlanningFor(null);
      } finally {
        setBusy(false);
      }
    },
    [selected, busy, recordOutcome],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
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
      const index = ['1', '2', '3', '4'].indexOf(event.key);
      const outcome = OUTCOME_TYPES[index];
      if (outcome) {
        event.preventDefault();
        void book(outcome);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [queue, selectedIndex, selectLead, book, planning]);

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
            {pendingConfirmation && pendingConfirmation.leadId !== selectedId && (
              <div
                role="status"
                className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded border border-brand-primary bg-panel px-4 py-2 text-sm"
              >
                <span>
                  Termin mit <strong>{pendingConfirmation.leadName}</strong> gebucht, noch nicht in
                  Salesforce eingetragen.
                </span>
                <Button onClick={() => selectLead(pendingConfirmation.leadId)}>
                  Jetzt eintragen
                </Button>
              </div>
            )}
            {selected ? (
              <BriefingPanel
                entry={selected}
                latest={latest.get(selected.lead.id)}
                callerName={DEMO_USER.fullName}
              />
            ) : (
              <p className="text-sm text-muted">Kein Lead ausgewählt.</p>
            )}
          </div>
          {selected && (
            <OutcomeBar
              leadName={selected.lead.name}
              latest={latest.get(selected.lead.id)}
              recall={openRecall}
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
