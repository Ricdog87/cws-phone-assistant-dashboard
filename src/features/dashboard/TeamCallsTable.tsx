import { Button } from '@/components/Button';
import { downloadText } from '@/components/download';
import { formatInt } from '@/components/format';
import { callsToCsv } from '@/domain/export';
import { OUTCOME_LABELS } from '@/domain/outcomes';
import {
  CALL_SOLUTIONS,
  CALL_SOLUTION_LABELS,
  COMPETITORS,
  PROTOCOL_FLAG_LABELS,
  protocolFlags,
  solutionText,
} from '@/domain/protocol';
import {
  filterCalls,
  summarizeCalls,
  type CallFilter,
  type SolutionFilter,
  type TeamCall,
} from '@/domain/teamCalls';
import { LiveTag } from './AssistantBrick';

const SELECT = 'rounded border border-border bg-panel px-2 py-1 text-xs font-bold text-brand-ink';

/** Filter nach aktueller Lösung und Wettbewerber, dazu der Export der Auswahl */
export function CallsFilterBar({
  calls,
  filter,
  onChange,
  fileLabel,
}: {
  calls: readonly TeamCall[];
  filter: CallFilter;
  onChange(filter: CallFilter): void;
  /** Teil des Dateinamens, etwa die Region */
  fileLabel: string;
}) {
  const count = (solution: SolutionFilter) =>
    filterCalls(calls, { solution, competitor: 'all' }).length;
  const competitorCount = (name: string) =>
    filterCalls(calls, { solution: 'competitor', competitor: name }).length;

  function exportCsv() {
    const date = new Date().toISOString().slice(0, 10);
    downloadText(callsToCsv(filterCalls(calls, filter)), `gespraeche-${fileLabel}-${date}.csv`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1.5 text-xs text-muted">
        Aktuelle Lösung
        <select
          value={filter.solution}
          onChange={(event) =>
            onChange({ solution: event.target.value as SolutionFilter, competitor: 'all' })
          }
          className={SELECT}
        >
          <option value="all">Alle ({formatInt(calls.length)})</option>
          {CALL_SOLUTIONS.map((solution) => (
            <option key={solution} value={solution}>
              {CALL_SOLUTION_LABELS[solution]} ({formatInt(count(solution))})
            </option>
          ))}
          <option value="open">Nicht erfasst ({formatInt(count('open'))})</option>
        </select>
      </label>
      <label className="flex items-center gap-1.5 text-xs text-muted">
        Wettbewerber
        <select
          value={filter.competitor}
          disabled={filter.solution !== 'competitor'}
          onChange={(event) => onChange({ ...filter, competitor: event.target.value })}
          className={`${SELECT} disabled:opacity-40`}
        >
          <option value="all">Alle</option>
          {COMPETITORS.map((name) => (
            <option key={name} value={name}>
              {name} ({formatInt(competitorCount(name))})
            </option>
          ))}
        </select>
      </label>
      <Button onClick={exportCsv} className="px-2 py-1 text-xs">
        CSV exportieren
      </Button>
    </div>
  );
}

/** Kennzahlen über der Liste; ein Klick auf einen Wettbewerber filtert */
export function CallsSummary({
  calls,
  onCompetitor,
}: {
  calls: readonly TeamCall[];
  onCompetitor(name: string): void;
}) {
  const summary = summarizeCalls(calls);
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border px-4 py-3 text-sm">
      <span>
        <strong className="tabular-nums">{formatInt(summary.companies)}</strong> Firmen mit Gespräch
      </span>
      <span>
        <strong className="tabular-nums">{formatInt(summary.netContacts)}</strong> Nettokontakte
        <span className="text-muted"> (Entscheider erreicht)</span>
      </span>
      <span className="flex flex-wrap items-center gap-1.5">
        <strong className="tabular-nums">{formatInt(summary.competitor)}</strong> beim Wettbewerb:
        {summary.byCompetitor.map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => onCompetitor(item.name)}
            className="rounded-full border border-border px-2 py-0.5 text-xs font-bold hover:border-brand-ink"
          >
            {item.name} <span className="tabular-nums">{formatInt(item.count)}</span>
          </button>
        ))}
      </span>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

/** Gespräche mit Protokoll, je Firma das jüngste, neueste oben */
export function TeamCallsTable({ calls }: { calls: readonly TeamCall[] }) {
  if (calls.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted">Keine Gespräche in dieser Auswahl.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="border-b border-border text-xs text-muted">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-normal">
              Datum
            </th>
            <th scope="col" className="px-4 py-2.5 font-normal">
              Firma
            </th>
            <th scope="col" className="px-4 py-2.5 font-normal">
              Aktuelle Lösung
            </th>
            <th scope="col" className="px-4 py-2.5 font-normal">
              Ergebnis
            </th>
            <th scope="col" className="px-4 py-2.5 font-normal">
              Hunter · Telefonassistenz
            </th>
            <th scope="col" className="px-4 py-2.5 font-normal">
              Notiz
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {calls.map((call) => {
            const flags = protocolFlags(call.protocol);
            return (
              <tr key={call.id} className="align-top hover:bg-surface">
                <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-muted">
                  {formatDate(call.recordedAt)}
                </td>
                <td className="px-4 py-2.5">
                  <span className="block font-bold">{call.leadName}</span>
                  <span className="block text-xs text-muted">{call.city}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="block">{solutionText(call.protocol) ?? '–'}</span>
                  {flags.length > 0 && (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {flags.map((flag) => (
                        <span
                          key={flag}
                          className="rounded border border-brand-primary px-1.5 text-[11px] font-bold text-brand-primary"
                        >
                          {PROTOCOL_FLAG_LABELS[flag]}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">{OUTCOME_LABELS[call.outcome]}</td>
                <td className="px-4 py-2.5">
                  <span className="block">{call.hunterName}</span>
                  <span className="flex items-center gap-2 text-xs text-muted">
                    {call.assistantName}
                    {call.live && <LiveTag />}
                  </span>
                </td>
                <td className="max-w-xs px-4 py-2.5 text-muted">{call.protocol.note ?? ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
