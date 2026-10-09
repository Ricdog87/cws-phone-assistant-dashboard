import { useId, useMemo, type ReactNode } from 'react';
import {
  CALL_SOLUTIONS,
  CALL_SOLUTION_LABELS,
  COMPETITORS,
  CONTACT_ROLES,
  CONTACT_ROLE_LABELS,
  PROTOCOL_FLAGS,
  PROTOCOL_FLAG_LABELS,
  PROTOCOL_NOTE_MAX_LENGTH,
} from '@/domain/protocol';
import { contractFollowUpDate } from '@/domain/recall';
import type { CallProtocol, CallSolution, ContactRole } from '@/domain/types';

interface ProtocolPanelProps {
  protocol: CallProtocol;
  onChange(protocol: CallProtocol): void;
  /** Heute als YYYY-MM-DD, für den Nachfass-Termin */
  today: string;
}

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

/** YYYY-MM-DD als 01.06.2027 */
function formatShort(day: string): string {
  return day.split('-').reverse().join('.');
}

const SELECT =
  'mt-1 block w-full min-w-0 rounded border border-border bg-panel px-2 py-1.5 text-sm text-brand-ink disabled:bg-surface disabled:text-muted';

function Field({
  label,
  aside,
  children,
}: {
  label: string;
  /** Hinweis rechts neben der Beschriftung */
  aside?: ReactNode;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="whitespace-nowrap text-xs font-bold text-muted">
          {label}
        </label>
        {aside}
      </div>
      {children(id)}
    </div>
  );
}

/**
 * Gesprächsprotokoll als kompaktes Formular: Auswahlfelder für Gesprächspartner, aktuelle
 * Lösung, Wettbewerber und Vertragsende (beide nur bei Wettbewerb), Hinweise zum Ankreuzen
 * und die Notiz. Speichern schickt es sofort als Aufgabe „Anruf“ nach Salesforce.
 */
export function ProtocolPanel({ protocol, onChange, today }: ProtocolPanelProps) {
  const set = (patch: Partial<CallProtocol>) => onChange({ ...protocol, ...patch });
  const months = useMemo(() => monthOptions(today), [today]);
  const competitor = protocol.solution === 'competitor';
  const followUp =
    competitor && protocol.contractEnd ? contractFollowUpDate(protocol.contractEnd) : null;

  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">Gesprächsprotokoll</legend>
      <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1.45fr)]">
        <Field label="Gesprächspartner">
          {(id) => (
            <select
              id={id}
              value={protocol.contactRole ?? ''}
              onChange={(event) =>
                set({ contactRole: (event.target.value || null) as ContactRole | null })
              }
              className={SELECT}
            >
              <option value="">Bitte wählen</option>
              {CONTACT_ROLES.map((role) => (
                <option key={role} value={role}>
                  {CONTACT_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Aktuelle Lösung">
          {(id) => (
            <select
              id={id}
              value={protocol.solution ?? ''}
              onChange={(event) => {
                const solution = (event.target.value || null) as CallSolution | null;
                set({
                  solution,
                  competitor: solution === 'competitor' ? protocol.competitor : null,
                  contractEnd: solution === 'competitor' ? protocol.contractEnd : null,
                });
              }}
              className={SELECT}
            >
              <option value="">Bitte wählen</option>
              {CALL_SOLUTIONS.map((solution) => (
                <option key={solution} value={solution}>
                  {CALL_SOLUTION_LABELS[solution]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Wettbewerber">
          {(id) => (
            <select
              id={id}
              value={protocol.competitor ?? ''}
              disabled={!competitor}
              onChange={(event) => set({ competitor: event.target.value || null })}
              className={SELECT}
            >
              <option value="">{competitor ? 'Bitte wählen' : 'nur bei Wettbewerb'}</option>
              {COMPETITORS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field
          label="Vertrag läuft bis"
          aside={
            followUp &&
            (followUp <= today ? (
              <strong
                className="min-w-0 truncate text-xs text-brand-primary"
                title="Vertrag endet in höchstens neun Monaten"
              >
                Jetzt nachfassen
              </strong>
            ) : (
              <span
                className="min-w-0 truncate text-xs text-muted"
                title={`Nachfassen ab ${formatShort(followUp)}, neun Monate vor Vertragsende`}
              >
                Nachfassen <strong className="text-brand-ink">{formatShort(followUp)}</strong>
              </span>
            ))
          }
        >
          {(id) => (
            <select
              id={id}
              value={protocol.contractEnd ?? ''}
              disabled={!competitor}
              onChange={(event) => set({ contractEnd: event.target.value || null })}
              className={SELECT}
            >
              <option value="">
                {competitor ? 'unbekannt, bitte erfragen' : 'nur bei Wettbewerb'}
              </option>
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-xs font-bold text-muted">Hinweise</span>
        {PROTOCOL_FLAGS.map((flag) => (
          <label key={flag} className="flex cursor-pointer items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={protocol[flag]}
              onChange={(event) => set({ [flag]: event.target.checked })}
              className="h-4 w-4 accent-brand-ink"
            />
            {PROTOCOL_FLAG_LABELS[flag]}
          </label>
        ))}
      </div>

      <Field label="Notiz zum Telefonat">
        {(id) => (
          <textarea
            id={id}
            rows={2}
            value={protocol.note ?? ''}
            maxLength={PROTOCOL_NOTE_MAX_LENGTH}
            onChange={(event) => set({ note: event.target.value })}
            placeholder="Was wurde besprochen? Etwa Ansprechpartner, Bedarf, nächste Schritte. Strg+Enter speichert."
            className="mt-1 block w-full resize-y rounded border border-border bg-panel px-2 py-1.5 text-sm text-brand-ink"
          />
        )}
      </Field>
    </fieldset>
  );
}
