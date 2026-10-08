import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/Button';
import { formatDay } from '@/components/format';
import { CONTRACT_RECALL_MONTHS_BEFORE } from '@/domain/qualificationConfig';
import {
  RECALL_NOTE_MAX_LENGTH,
  RECALL_REASON_LABELS,
  nextBusinessDay,
  suggestRecallDate,
  weekdayAfterDays,
} from '@/domain/recall';
import type { RecallReason } from '@/domain/types';
import type { RecallDraft } from './useRecordOutcome';

interface RecallFormProps {
  leadName: string;
  today: Date;
  busy: boolean;
  onSave(draft: RecallDraft): void;
  onCancel(): void;
  /** Vertragsende zu nah: stattdessen jetzt einen Termin vereinbaren */
  onBookAppointment(): void;
}

const REASONS: readonly RecallReason[] = ['callback', 'contractEnd'];

/** So weit reicht die Auswahl für das Vertragsende */
const CONTRACT_MONTHS_AHEAD = 60;

function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthOptions(today: Date): { value: string; label: string }[] {
  return Array.from({ length: CONTRACT_MONTHS_AHEAD }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() + index, 1);
    return {
      value: isoDate(date).slice(0, 7),
      label: date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
    };
  });
}

/**
 * Wiedervorlage planen: vereinbarter Rückruf mit Datum und optionaler Uhrzeit oder
 * Vertragsende, aus dem sich das Datum nach der bestehenden Regel ergibt.
 */
export function RecallForm({
  leadName,
  today,
  busy,
  onSave,
  onCancel,
  onBookAppointment,
}: RecallFormProps) {
  const id = useId();
  const dateRef = useRef<HTMLInputElement>(null);
  const [reason, setReason] = useState<RecallReason>('callback');
  const [dueDate, setDueDate] = useState(() => nextBusinessDay(today));
  const [dueTime, setDueTime] = useState('');
  const [contractEnd, setContractEnd] = useState('');
  const [note, setNote] = useState('');
  const months = useMemo(() => monthOptions(today), [today]);
  const minDate = isoDate(today);

  const quickPicks = useMemo(
    () => [
      { label: 'Nächster Werktag', value: nextBusinessDay(today) },
      { label: 'In 1 Woche', value: weekdayAfterDays(today, 7) },
      { label: 'In 4 Wochen', value: weekdayAfterDays(today, 28) },
    ],
    [today],
  );

  const suggested = contractEnd ? suggestRecallDate(contractEnd, today) : null;
  const effectiveDate = reason === 'callback' ? dueDate : suggested;
  const valid =
    reason === 'callback' ? dueDate >= minDate : suggested !== null && suggested !== 'bookNow';

  useEffect(() => {
    dateRef.current?.focus();
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || !effectiveDate || effectiveDate === 'bookNow') return;
    const trimmed = note.trim();
    onSave({
      reason,
      dueDate: effectiveDate,
      dueTime: reason === 'callback' && dueTime ? dueTime : null,
      contractEnd: reason === 'contractEnd' ? contractEnd : null,
      note: trimmed ? trimmed : null,
    });
  }

  return (
    <form
      aria-label="Wiedervorlage planen"
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
      }}
      className="space-y-3"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold">Wiedervorlage für {leadName}</h3>
        <span className="text-xs text-muted">Escape bricht ab</span>
      </div>

      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Grund</legend>
        {REASONS.map((item) => (
          <label
            key={item}
            className={`cursor-pointer rounded border px-3 py-1.5 text-sm font-bold ${
              reason === item
                ? 'border-brand-ink bg-brand-ink text-on-primary'
                : 'border-border bg-panel text-brand-ink hover:border-brand-ink'
            }`}
          >
            <input
              type="radio"
              name={`${id}-reason`}
              value={item}
              checked={reason === item}
              onChange={() => setReason(item)}
              className="sr-only"
            />
            {item === 'contractEnd' ? 'Vertragsende bekannt' : RECALL_REASON_LABELS[item]}
          </label>
        ))}
      </fieldset>

      {reason === 'callback' ? (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted">
            Datum
            <input
              ref={dateRef}
              type="date"
              required
              min={minDate}
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="mt-1 block rounded border border-border bg-panel px-2 py-1.5 text-sm text-brand-ink"
            />
          </label>
          <label className="text-xs text-muted">
            Uhrzeit (optional)
            <input
              type="time"
              step={900}
              value={dueTime}
              onChange={(event) => setDueTime(event.target.value)}
              className="mt-1 block rounded border border-border bg-panel px-2 py-1.5 text-sm text-brand-ink"
            />
          </label>
          <div className="flex flex-wrap gap-1">
            {quickPicks.map((pick) => (
              <button
                key={pick.label}
                type="button"
                onClick={() => setDueDate(pick.value)}
                aria-pressed={dueDate === pick.value}
                className={`rounded border px-2 py-1 text-xs ${
                  dueDate === pick.value
                    ? 'border-brand-ink font-bold text-brand-ink'
                    : 'border-border text-muted hover:border-brand-ink'
                }`}
              >
                {pick.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-xs text-muted">
            Vertragsende
            <select
              value={contractEnd}
              onChange={(event) => setContractEnd(event.target.value)}
              className="mt-1 block rounded border border-border bg-panel px-2 py-1.5 text-sm text-brand-ink"
            >
              <option value="">Monat wählen</option>
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>
          {suggested === 'bookNow' && (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-2 text-sm font-bold text-brand-primary"
            >
              <span>Vertragsende liegt zu nah für eine Wiedervorlage.</span>
              <Button variant="primary" onClick={onBookAppointment} disabled={busy}>
                Jetzt Termin vereinbaren
              </Button>
            </div>
          )}
          {suggested && suggested !== 'bookNow' && (
            <p className="text-sm">
              Wiedervorlage am <strong>{formatDay(suggested)}</strong>,{' '}
              {CONTRACT_RECALL_MONTHS_BEFORE} Monate vor Vertragsende.
            </p>
          )}
        </div>
      )}

      <label className="block text-xs text-muted">
        Notiz (optional)
        <input
          type="text"
          value={note}
          maxLength={RECALL_NOTE_MAX_LENGTH}
          onChange={(event) => setNote(event.target.value)}
          placeholder="z. B. erst nach 14 Uhr erreichbar, Einkauf entscheidet mit"
          className="mt-1 block w-full rounded border border-border bg-panel px-2 py-1.5 text-sm text-brand-ink"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={!valid || busy}>
          Wiedervorlage speichern
        </Button>
        <Button onClick={onCancel}>Abbrechen</Button>
      </div>
    </form>
  );
}
