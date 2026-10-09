import { useId } from 'react';
import { Button } from '@/components/Button';
import { formatDateTime, formatDay } from '@/components/format';
import { SyncBadge } from '@/components/SyncBadge';
import { OUTCOME_LABELS } from '@/domain/outcomes';
import { SYNC_STATUS_LABELS, type SyncStatus } from '@/domain/salesforceSync';
import type { CallOutcome, CallProtocol, OutcomeType, Recall } from '@/domain/types';
import { KEYED_OUTCOMES } from './outcomeKeys';
import { ProtocolPanel } from './ProtocolPanel';
import { RecallForm } from './RecallForm';
import type { RecallDraft } from './useRecordOutcome';

export interface SavedProtocolState {
  savedAt: string;
  /** Übertragung nach Salesforce */
  status: SyncStatus | undefined;
}

/** Stand aus einem früheren Gespräch zur Firma, etwa Wettbewerber und Vertragsende */
export interface KnownState {
  recordedAt: string;
  assistantName: string;
  /** Ergebnis des Gesprächs in Worten */
  outcome: string;
  summary: string;
  /** Übernehmen ändert etwas am aktuellen Protokoll */
  canCarryOver: boolean;
}

interface OutcomeBarProps {
  leadName: string;
  latest: CallOutcome | undefined;
  /** Übertragung des letzten Ergebnisses nach Salesforce */
  latestSync: SyncStatus | undefined;
  /** Offene Wiedervorlage zum Lead */
  recall: Recall | undefined;
  protocol: CallProtocol;
  onProtocolChange(protocol: CallProtocol): void;
  known: KnownState | null;
  onCarryOver(): void;
  /** Zuletzt gespeichertes Protokoll; null, solange zum Gespräch nichts gespeichert ist */
  saved: SavedProtocolState | null;
  /** Änderungen seit dem letzten Speichern */
  dirty: boolean;
  saving: boolean;
  onProtocolSave(): void;
  /** Gesprächsprotokoll aufgeklappt; zugeklappt bleibt Platz für Briefing und Leitfaden */
  open: boolean;
  onToggle(): void;
  busy: boolean;
  /** Formular Wiedervorlage ist geöffnet */
  planning: boolean;
  today: Date;
  /** today als YYYY-MM-DD */
  todayIso: string;
  onRecord(outcome: OutcomeType): void;
  onRecallSave(draft: RecallDraft): void;
  onRecallCancel(): void;
}

function shortDay(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const APPOINTMENT_HINT =
  'Termin in Salesforce gebucht? Hier erfassen, damit er im Wochenziel und im Dashboard zählt.';

function ProtocolStatus({
  saved,
  dirty,
  known,
  open,
}: Pick<OutcomeBarProps, 'saved' | 'dirty' | 'known' | 'open'>) {
  if (dirty) {
    return <span className="font-bold text-brand-primary">Ungespeicherte Änderungen</span>;
  }
  if (saved) {
    return (
      <>
        <span>Gespeichert {formatDateTime(saved.savedAt)}</span>
        {saved.status && <SyncBadge status={saved.status} />}
      </>
    );
  }
  if (known && !open) {
    return (
      <span className="min-w-0 truncate" title={known.summary}>
        Bekannt: <strong className="text-brand-ink">{known.summary}</strong>
      </span>
    );
  }
  return (
    <span>
      {open ? 'Speichern schickt das Protokoll sofort an Salesforce' : 'Noch kein Protokoll'}
    </span>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

/**
 * Gesprächsprotokoll und Ergebnis unter dem Briefing. Zugeklappt nur eine schmale Leiste mit
 * „Telefonat“, Stand und Ergebnis-Schaltflächen, damit Briefing und Leitfaden Platz haben;
 * „Telefonat“ (Taste T) klappt das Protokoll auf. Es geht beim Speichern sofort nach
 * Salesforce, jede Änderung in dieselbe Aufgabe; das Ergebnis ergänzt sie.
 */
export function OutcomeBar({
  leadName,
  latest,
  latestSync,
  recall,
  protocol,
  onProtocolChange,
  known,
  onCarryOver,
  saved,
  dirty,
  saving,
  onProtocolSave,
  open,
  onToggle,
  busy,
  planning,
  today,
  todayIso,
  onRecord,
  onRecallSave,
  onRecallCancel,
}: OutcomeBarProps) {
  const panelId = useId();
  return (
    <section
      aria-label="Ergebnis erfassen"
      className="flex max-h-[72%] shrink-0 flex-col border-t-2 border-brand-ink bg-panel"
    >
      <div className="flex shrink-0 items-center gap-3 px-6 py-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-keyshortcuts="T"
          onClick={onToggle}
          className={`inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm font-bold ${
            open
              ? 'border-brand-ink bg-brand-ink text-on-primary'
              : 'border-brand-ink bg-panel text-brand-ink hover:bg-surface'
          }`}
        >
          Telefonat
          <Chevron open={open} />
        </button>
        <span
          role="status"
          className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-xs text-muted"
        >
          <ProtocolStatus saved={saved} dirty={dirty} known={known} open={open} />
        </span>
        <Button
          size="sm"
          variant={dirty ? 'primary' : 'secondary'}
          disabled={!dirty || saving || busy}
          onClick={onProtocolSave}
          aria-keyshortcuts="Control+Enter"
          title="Strg+Enter"
        >
          Protokoll speichern
        </Button>
      </div>
      {(open || planning) && (
        <div
          id={panelId}
          className="min-h-0 space-y-2.5 overflow-y-auto border-t border-border px-6 pb-3 pt-3"
        >
          {open && known && (
            <div
              aria-label="Bekannter Stand"
              className="flex items-center gap-3 rounded border border-border bg-surface px-3 py-1.5 text-xs"
            >
              <span className="whitespace-nowrap text-muted">
                Bekannt seit {shortDay(known.recordedAt)} · {known.assistantName} · {known.outcome}
              </span>
              <strong className="min-w-0 flex-1 truncate text-brand-ink" title={known.summary}>
                {known.summary}
              </strong>
              {known.canCarryOver && (
                <button
                  type="button"
                  onClick={onCarryOver}
                  className="whitespace-nowrap font-bold text-brand-ink underline"
                >
                  Übernehmen
                </button>
              )}
            </div>
          )}
          {open && (
            <ProtocolPanel protocol={protocol} onChange={onProtocolChange} today={todayIso} />
          )}
          {planning && (
            <RecallForm
              leadName={leadName}
              defaultReason={protocol.solution === 'competitor' ? 'contractEnd' : 'callback'}
              defaultContractEnd={protocol.contractEnd}
              today={today}
              busy={busy}
              onSave={onRecallSave}
              onCancel={onRecallCancel}
              onBookAppointment={() => onRecord('appointment')}
            />
          )}
        </div>
      )}
      {!planning && (
        <div className="shrink-0 border-t border-border px-6 pb-2.5 pt-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
              {KEYED_OUTCOMES.map((type, index) => (
                <Button
                  key={type}
                  disabled={busy}
                  onClick={() => onRecord(type)}
                  aria-keyshortcuts={String(index + 1)}
                >
                  <span className="mr-2 rounded border border-current px-1 text-xs">
                    {index + 1}
                  </span>
                  {OUTCOME_LABELS[type]}
                </Button>
              ))}
            </div>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => onRecord('appointment')}
              title={APPOINTMENT_HINT}
            >
              Termin gebucht
            </Button>
          </div>
          <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs text-muted">
            <span>
              T öffnet das Protokoll, 1 bis 3 buchen das Ergebnis, Strg+Enter speichert, Pfeil hoch
              und runter wechselt den Lead.
            </span>
            {latest && (
              <span>
                Zuletzt erfasst:{' '}
                <strong className="text-brand-ink">{OUTCOME_LABELS[latest.outcome]}</strong> am{' '}
                {formatDateTime(latest.recordedAt)}
                {recall && ` · fällig ${formatDay(recall.dueDate)}`}
                {latestSync && ` · ${SYNC_STATUS_LABELS[latestSync]}`}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
