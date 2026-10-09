import { useId, type ReactNode } from 'react';
import { formatInt } from '@/components/format';
import {
  ALL_MARKET,
  FOLLOW_UP_BUCKETS,
  FOLLOW_UP_LABELS,
  competitorChoice,
  countBy,
  filterMarket,
  isFiltered,
  type MarketFilter,
  type MarketRow,
  type SolutionChoice,
} from '@/domain/market';
import { CALL_SOLUTIONS, CALL_SOLUTION_LABELS, COMPETITORS } from '@/domain/protocol';

interface MarketFiltersProps {
  rows: readonly MarketRow[];
  filter: MarketFilter;
  onChange(filter: MarketFilter): void;
  /** Regionen zur Auswahl, nur für die Vertriebsleitung */
  regions?: readonly { id: string; name: string }[];
  /** Hunter wählbar, nur für die Führung */
  showHunter: boolean;
}

const SELECT =
  'mt-1 block w-full min-w-0 rounded border border-border bg-panel px-2 py-1.5 text-sm font-bold text-brand-ink';

function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-xs text-muted">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

/** Filter in einer Zeile über den Grafiken; jede Auswahl wirkt auf die ganze Ansicht */
export function MarketFilters({ rows, filter, onChange, regions, showHunter }: MarketFiltersProps) {
  const set = (patch: Partial<MarketFilter>) => onChange({ ...filter, ...patch });
  // Zahlen je Auswahl mit allen übrigen Filtern, ohne den eigenen
  const without = (key: keyof MarketFilter) => filterMarket(rows, filter, [key]);
  const hunters = countBy(without('hunter'), (row) => row.hunterName);
  const industries = countBy(without('industry'), (row) => row.industry || 'Branche unbekannt');
  const bySolution = without('solution');
  const solutionCount = (choice: SolutionChoice) =>
    filterMarket(bySolution, { ...ALL_MARKET, solution: choice }).length;
  const byFollowUp = without('followUp');
  const columns = 3 + (regions ? 1 : 0) + (showHunter ? 1 : 0);

  return (
    <div role="search" aria-label="Filter" className="rounded-lg border border-border bg-panel p-4">
      <div
        className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${
          columns >= 5 ? 'xl:grid-cols-5' : columns === 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'
        }`}
      >
        {regions && (
          <Field label="Region">
            {(id) => (
              <select
                id={id}
                value={filter.regionId}
                onChange={(event) => set({ regionId: event.target.value, hunter: 'all' })}
                className={SELECT}
              >
                <option value="all">Alle Regionen</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
        {showHunter && (
          <Field label="Hunter">
            {(id) => (
              <select
                id={id}
                value={filter.hunter}
                onChange={(event) => set({ hunter: event.target.value })}
                className={SELECT}
              >
                <option value="all">Alle Hunter</option>
                {hunters.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.value} ({formatInt(item.count)})
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
        <Field label="Branche">
          {(id) => (
            <select
              id={id}
              value={filter.industry}
              onChange={(event) => set({ industry: event.target.value })}
              className={SELECT}
            >
              <option value="all">Alle Branchen</option>
              {industries.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.value} ({formatInt(item.count)})
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Aktuelle Lösung">
          {(id) => (
            <select
              id={id}
              value={filter.solution}
              onChange={(event) => set({ solution: event.target.value as SolutionChoice })}
              className={SELECT}
            >
              <option value="all">Alle Lösungen</option>
              <optgroup label="Wettbewerb (Mietservice)">
                <option value="competitor">
                  Wettbewerb gesamt ({formatInt(solutionCount('competitor'))})
                </option>
                {COMPETITORS.map((name) => (
                  <option key={name} value={competitorChoice(name)}>
                    {name} ({formatInt(solutionCount(competitorChoice(name)))})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Andere Lösungen">
                {CALL_SOLUTIONS.filter((solution) => solution !== 'competitor').map((solution) => (
                  <option key={solution} value={solution}>
                    {CALL_SOLUTION_LABELS[solution]} ({formatInt(solutionCount(solution))})
                  </option>
                ))}
                <option value="open">Nicht erfasst ({formatInt(solutionCount('open'))})</option>
              </optgroup>
            </select>
          )}
        </Field>
        <Field label="Nachfassen">
          {(id) => (
            <select
              id={id}
              value={filter.followUp}
              onChange={(event) =>
                set({ followUp: event.target.value as MarketFilter['followUp'] })
              }
              className={SELECT}
            >
              <option value="all">Alle Zeitpunkte</option>
              {FOLLOW_UP_BUCKETS.map((bucket) => (
                <option key={bucket} value={bucket}>
                  {FOLLOW_UP_LABELS[bucket]} (
                  {formatInt(byFollowUp.filter((row) => row.bucket === bucket).length)})
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      {isFiltered(filter) && (
        <button
          type="button"
          onClick={() => onChange(ALL_MARKET)}
          className="mt-3 text-xs font-bold text-brand-ink underline"
        >
          Alle Filter zurücksetzen
        </button>
      )}
    </div>
  );
}
