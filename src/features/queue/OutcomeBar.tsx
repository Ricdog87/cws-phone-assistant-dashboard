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

interface OutcomeBarProps {
  leadName: string;
  latest: CallOutcome | undefined;
  /** Übertragung des letzten Ergebnisses nach Salesforce */
  latestSync: SyncStatus | undefined;
  /** Offene Wiedervorlage zum Lead */
  recall: Recall | undefined;
  protocol: CallProtocol;
  onProtocolChange(protocol: CallProtocol): void;
  /** Zuletzt gespeichertes Protokoll; null, solange zum Gespräch nichts gespeichert ist */
  saved: SavedProtocolState | null;
  /** Änderungen seit dem letzten Speichern */
  dirty: boolean;
  saving: boolean;
  onProtocolSave(): void;
  busy: boolean;
  /** Formular Wiedervorlage ist geöffnet */
  planning: boolean;
  today: Date;
  onRecord(outcome: OutcomeType): void;
  onRecallSave(draft: RecallDraft): void;
  onRecallCancel(): void;
}

const APPOINTMENT_HINT =
  'Termin in Salesforce gebucht? Hier erfassen, damit er im Wochenziel und im Dashboard zählt.';

function ProtocolStatus({ saved, dirty }: Pick<OutcomeBarProps, 'saved' | 'dirty'>) {
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
  return <span>Speichern schickt das Protokoll sofort an Salesforce</span>;
}

/**
 * Gesprächsprotokoll und Ergebnis an einem Fleck, immer sichtbar unter dem Briefing.
 * Das Protokoll geht beim Speichern sofort nach Salesforce, jede Änderung in dieselbe
 * Aufgabe; das Ergebnis ergänzt sie.
 */
export function OutcomeBar({
  leadName,
  latest,
  latestSync,
  recall,
  protocol,
  onProtocolChange,
  saved,
  dirty,
  saving,
  onProtocolSave,
  busy,
  planning,
  today,
  onRecord,
  onRecallSave,
  onRecallCancel,
}: OutcomeBarProps) {
  return (
    <section
      aria-label="Ergebnis erfassen"
      className="space-y-3 border-t-2 border-brand-ink bg-panel px-6 py-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Gesprächsprotokoll</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span role="status" className="flex flex-wrap items-center gap-2">
            <ProtocolStatus saved={saved} dirty={dirty} />
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
      </div>
      <ProtocolPanel protocol={protocol} onChange={onProtocolChange} />
      {planning ? (
        <RecallForm
          leadName={leadName}
          defaultReason={protocol.solution === 'competitor' ? 'contractEnd' : 'callback'}
          today={today}
          busy={busy}
          onSave={onRecallSave}
          onCancel={onRecallCancel}
          onBookAppointment={() => onRecord('appointment')}
        />
      ) : (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
              {KEYED_OUTCOMES.map((type, index) => (
                <Button
                  key={type}
                  disabled={busy}
                  onClick={() => onRecord(type)}
                  aria-keyshortcuts={String(index + 1)}
                  className="py-2.5"
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
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs text-muted">
            <span>
              Tasten 1 bis 3 buchen das Ergebnis, Strg+Enter speichert das Protokoll, Pfeil hoch und
              runter wechselt den Lead.
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
