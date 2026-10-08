import { Button } from '@/components/Button';
import { formatDateTime, formatDay } from '@/components/format';
import { OUTCOME_LABELS, OUTCOME_TYPES } from '@/domain/outcomes';
import type { CallOutcome, OutcomeType, Recall } from '@/domain/types';
import { RecallForm } from './RecallForm';
import type { RecallDraft } from './useRecordOutcome';

interface OutcomeBarProps {
  leadName: string;
  latest: CallOutcome | undefined;
  /** Offene Wiedervorlage zum Lead */
  recall: Recall | undefined;
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
 * Ergebnisleiste unter dem Briefing, immer sichtbar: Termin, Wiedervorlage, nicht
 * erreicht, kein Interesse. „Termin vereinbaren“ öffnet den Salesforce-Kalender, die
 * Wiedervorlage fragt vor dem Buchen das Datum ab.
 */
export function OutcomeBar({
  leadName,
  latest,
  recall,
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
      className="border-t-2 border-brand-ink bg-panel px-6 py-3"
    >
      {planning ? (
        <RecallForm
          leadName={leadName}
          today={today}
          busy={busy}
          onSave={onRecallSave}
          onCancel={onRecallCancel}
          onBookAppointment={() => onRecord('appointment')}
        />
      ) : (
        <>
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
              </span>
            )}
          </div>
        </>
      )}
    </section>
  );
}
