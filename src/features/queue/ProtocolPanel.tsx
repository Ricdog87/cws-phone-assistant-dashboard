import { useId } from 'react';
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
import type { CallProtocol, CallSolution, ContactRole } from '@/domain/types';

interface ProtocolPanelProps {
  protocol: CallProtocol;
  onChange(protocol: CallProtocol): void;
}

const SELECT =
  'mt-1 block w-full rounded border border-border bg-panel px-2 py-1.5 text-sm text-brand-ink disabled:opacity-40';

/**
 * Gesprächsprotokoll direkt über den Ergebnis-Schaltflächen: erst Auswahlfelder, dann die
 * Notiz zum Telefonat. Geht mit dem Ergebnis als Aufgabe „Anruf“ nach Salesforce.
 */
export function ProtocolPanel({ protocol, onChange }: ProtocolPanelProps) {
  const id = useId();
  const set = (patch: Partial<CallProtocol>) => onChange({ ...protocol, ...patch });

  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">Gesprächsprotokoll</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="text-xs text-muted" htmlFor={`${id}-role`}>
          Gesprächspartner
          <select
            id={`${id}-role`}
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
        </label>
        <label className="text-xs text-muted" htmlFor={`${id}-solution`}>
          Aktuelle Lösung
          <select
            id={`${id}-solution`}
            value={protocol.solution ?? ''}
            onChange={(event) => {
              const solution = (event.target.value || null) as CallSolution | null;
              set({ solution, competitor: solution === 'competitor' ? protocol.competitor : null });
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
        </label>
        <label className="text-xs text-muted" htmlFor={`${id}-competitor`}>
          Wettbewerber
          <select
            id={`${id}-competitor`}
            value={protocol.competitor ?? ''}
            disabled={protocol.solution !== 'competitor'}
            onChange={(event) => set({ competitor: event.target.value || null })}
            className={SELECT}
          >
            <option value="">
              {protocol.solution === 'competitor' ? 'Bitte wählen' : 'nur bei Wettbewerb'}
            </option>
            {COMPETITORS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
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
      <label className="block text-xs text-muted" htmlFor={`${id}-note`}>
        Notiz zum Telefonat
        <textarea
          id={`${id}-note`}
          rows={2}
          value={protocol.note ?? ''}
          maxLength={PROTOCOL_NOTE_MAX_LENGTH}
          onChange={(event) => set({ note: event.target.value })}
          placeholder="Was wurde besprochen? Etwa Vertragslaufzeit, Ansprechpartner, nächste Schritte"
          className="mt-1 block w-full resize-y rounded border border-border bg-panel px-2 py-1.5 text-sm text-brand-ink"
        />
      </label>
    </fieldset>
  );
}
