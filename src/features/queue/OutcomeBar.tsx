import { Button } from '@/components/Button';
import { formatDateTime, formatDay } from '@/components/format';
import { OUTCOME_LABELS, OUTCOME_TYPES } from '@/domain/outcomes';
import { SYNC_STATUS_LABELS, type SyncStatus } from '@/domain/salesforceSync';
import type { CallOutcome, CallProtocol, OutcomeType, Recall } from '@/domain/types';
import { ProtocolPanel } from './ProtocolPanel';
import { RecallForm } from './RecallForm';
import type { RecallDraft } from './useRecordOutcome';

interface OutcomeBarProps {
  leadName: string;
  latest: CallOutcome | undefined;
  /** Übertragung des letzten Ergebnisses nach Salesforce */
  latestSync: SyncStatus | undefined;
  /** Offene Wiedervorlage zum Lead */
  recall: Recall | undefined;
  protocol: CallProtocol;
  onProtocolChange(protocol: CallProtocol): void;
  busy: boolean;
  /** Formular Wiedervorlage ist geöffnet */
  planning: boolean;
  today: Date;
  onRecord(outcome: OutcomeType): void;
  onRecallSave(draft: RecallDraft): void;
  onRecallCancel(): void;
}

const CALENDAR_HINT = 'Öffnet den Salesforce-Kalender in der Wochenansicht';

/**
 * Gesprächsprotokoll und Ergebnis an einem Fleck, immer sichtbar unter dem Briefing.
 * Erst Auswahlfelder und Notiz, dann das Ergebnis; beides geht automatisch nach Salesforce.
 */
export function OutcomeBar({
  leadName,
  latest,
  latestSync,
  recall,
  protocol,
  onProtocolChange,
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
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Gesprächsprotokoll</h3>
        <span className="text-xs text-muted">geht mit dem Ergebnis automatisch an Salesforce</span>
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
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {OUTCOME_TYPES.map((type, index) => (
              <Button
                key={type}
                variant={type === 'appointment' ? 'primary' : 'secondary'}
                disabled={busy}
                onClick={() => onRecord(type)}
                aria-keyshortcuts={String(index + 1)}
                title={type === 'appointment' ? CALENDAR_HINT : undefined}
                className="py-2.5"
              >
                <span className="mr-2 rounded border border-current px-1 text-xs">{index + 1}</span>
                {type === 'appointment' ? 'Termin vereinbaren' : OUTCOME_LABELS[type]}
              </Button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs text-muted">
            <span>
              1 öffnet den Salesforce-Kalender, 2 plant die Wiedervorlage. Pfeil hoch und runter
              wechselt den Lead.
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
