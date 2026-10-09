import { useId, useMemo, type ReactNode } from 'react';
import { formatDay } from '@/components/format';
import {
  CALL_SOLUTIONS,
  COMPETITORS,
  CONTACT_ROLES,
  CONTACT_ROLE_LABELS,
  PROTOCOL_FLAGS,
  PROTOCOL_FLAG_LABELS,
  PROTOCOL_NOTE_MAX_LENGTH,
} from '@/domain/protocol';
import { contractFollowUpDate } from '@/domain/recall';
import type { CallProtocol, CallSolution } from '@/domain/types';

interface ProtocolPanelProps {
  protocol: CallProtocol;
  onChange(protocol: CallProtocol): void;
  /** Heute als YYYY-MM-DD, für den Nachfass-Termin */
  today: string;
}

/** Kurze Bezeichnungen für die Auswahl; die langen stehen in CALL_SOLUTION_LABELS */
const SOLUTION_CHIPS: Record<CallSolution, string> = {
  companyBuys: 'Firma kauft selbst',
  employeesBuy: 'Mitarbeitende kaufen',
  competitor: 'Wettbewerb (Miete)',
  none: 'Keine Berufskleidung',
};

/** So weit reicht die Auswahl für das Vertragsende */
const CONTRACT_MONTHS_AHEAD = 60;

function monthOptions(today: string): { value: string; label: string }[] {
  const [year = 1970, month = 1] = today.split('-').map(Number);
  return Array.from({ length: CONTRACT_MONTHS_AHEAD }, (_, index) => {
    const date = new Date(year, month - 1 + index, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return { value, label: date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }) };
  });
}

const CHIP =
  'inline-flex cursor-pointer select-none items-center rounded-full border px-2.5 py-0.5 text-[13px] leading-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-ink';
const CHIP_ON = 'border-brand-ink bg-brand-ink font-bold text-on-primary';
const CHIP_OFF = 'border-border bg-panel text-brand-ink hover:border-brand-ink';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-center gap-x-3 gap-y-1 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
      <span className="text-xs font-bold text-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

/** Auswahl als Chips; ein zweiter Klick auf die gewählte hebt sie wieder auf */
function ChoiceChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange(value: T | null): void;
}) {
  const name = useId();
  return (
    <Row label={label}>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label key={option.value}>
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                onClick={() => checked && onChange(null)}
                className="peer sr-only"
              />
              <span className={`${CHIP} ${checked ? CHIP_ON : CHIP_OFF}`}>{option.label}</span>
            </label>
          );
        })}
      </div>
    </Row>
  );
}

/**
 * Gesprächsprotokoll direkt über den Ergebnis-Schaltflächen, alles per Klick: Gesprächspartner,
 * aktuelle Lösung, bei Wettbewerb Anbieter und Vertragsende mit Nachfass-Termin, Hinweise,
 * dann die Notiz. Speichern schickt es sofort als Aufgabe „Anruf“ nach Salesforce.
 */
export function ProtocolPanel({ protocol, onChange, today }: ProtocolPanelProps) {
  const id = useId();
  const set = (patch: Partial<CallProtocol>) => onChange({ ...protocol, ...patch });
  const months = useMemo(() => monthOptions(today), [today]);
  const competitor = protocol.solution === 'competitor';
  const followUp = protocol.contractEnd ? contractFollowUpDate(protocol.contractEnd) : null;

  return (
    <fieldset className="space-y-1.5">
      <legend className="sr-only">Gesprächsprotokoll</legend>
      <ChoiceChips
        label="Gesprächspartner"
        options={CONTACT_ROLES.map((role) => ({ value: role, label: CONTACT_ROLE_LABELS[role] }))}
        value={protocol.contactRole}
        onChange={(contactRole) => set({ contactRole })}
      />
      <ChoiceChips
        label="Aktuelle Lösung"
        options={CALL_SOLUTIONS.map((solution) => ({
          value: solution,
          label: SOLUTION_CHIPS[solution],
        }))}
        value={protocol.solution}
        onChange={(solution) =>
          set({
            solution,
            competitor: solution === 'competitor' ? protocol.competitor : null,
            contractEnd: solution === 'competitor' ? protocol.contractEnd : null,
          })
        }
      />
      {competitor && (
        <>
          <ChoiceChips
            label="Wettbewerber"
            options={COMPETITORS.map((name) => ({ value: name, label: name }))}
            value={protocol.competitor}
            onChange={(name) => set({ competitor: name })}
          />
          <Row label="Vertrag läuft bis">
            <select
              id={`${id}-contract`}
              aria-label="Vertrag läuft bis"
              value={protocol.contractEnd ?? ''}
              onChange={(event) => set({ contractEnd: event.target.value || null })}
              className="rounded border border-border bg-panel px-2 py-0.5 text-[13px] text-brand-ink"
            >
              <option value="">unbekannt, bitte erfragen</option>
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            {followUp &&
              (followUp <= today ? (
                <span className="text-sm font-bold text-brand-primary">
                  Nachfassen jetzt möglich
                </span>
              ) : (
                <span className="text-sm text-muted">
                  Nachfassen ab <strong className="text-brand-ink">{formatDay(followUp)}</strong>
                </span>
              ))}
          </Row>
        </>
      )}
      <Row label="Hinweise">
        {PROTOCOL_FLAGS.map((flag) => (
          <label key={flag}>
            <input
              type="checkbox"
              checked={protocol[flag]}
              onChange={(event) => set({ [flag]: event.target.checked })}
              className="peer sr-only"
            />
            <span className={`${CHIP} ${protocol[flag] ? CHIP_ON : CHIP_OFF}`}>
              {PROTOCOL_FLAG_LABELS[flag]}
            </span>
          </label>
        ))}
      </Row>
      <div className="grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
        <label htmlFor={`${id}-note`} className="pt-1.5 text-xs font-bold text-muted">
          Notiz zum Telefonat
        </label>
        <textarea
          id={`${id}-note`}
          rows={2}
          value={protocol.note ?? ''}
          maxLength={PROTOCOL_NOTE_MAX_LENGTH}
          onChange={(event) => set({ note: event.target.value })}
          placeholder="Was wurde besprochen? Etwa Ansprechpartner, Bedarf, nächste Schritte. Strg+Enter speichert."
          className="block w-full resize-y rounded border border-border bg-panel px-2 py-1.5 text-sm text-brand-ink"
        />
      </div>
    </fieldset>
  );
}
