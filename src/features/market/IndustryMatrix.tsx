import { useState } from 'react';
import { formatInt } from '@/components/format';
import type { IndustryRow } from '@/domain/market';
import { COMPETITORS } from '@/domain/protocol';

interface IndustryMatrixProps {
  rows: readonly IndustryRow[];
  /** Gewählte Branche, all für alle */
  selected: string;
  onSelect(industry: string): void;
}

/** So viele Branchen sind sofort sichtbar */
const INITIAL_ROWS = 10;

/**
 * Branchen mal Wettbewerber: wie viele Firmen einer Branche bei welchem Anbieter sind. Je
 * mehr Firmen, desto kräftiger die Zelle. Ein Klick auf die Branche filtert die Ansicht.
 */
export function IndustryMatrix({ rows, selected, onSelect }: IndustryMatrixProps) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? rows : rows.slice(0, INITIAL_ROWS);
  const max = Math.max(
    1,
    ...rows.flatMap((row) => COMPETITORS.map((name) => row.byCompetitor[name] ?? 0)),
  );

  return (
    <section
      aria-label="Branchen und Wettbewerber"
      className="overflow-hidden rounded-lg border border-border bg-panel"
    >
      <header className="px-5 pt-5">
        <h3 className="text-sm font-bold">Branchen und Wettbewerber</h3>
        <p className="mt-0.5 text-xs text-muted">
          Firmen je Branche beim jeweiligen Anbieter. Klick auf eine Branche filtert.
        </p>
      </header>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">Keine Gespräche in dieser Auswahl.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border text-left text-xs text-muted">
                <th className="px-5 py-2 font-bold">Branche</th>
                <th className="px-3 py-2 text-right font-bold">Firmen</th>
                <th className="px-3 py-2 text-right font-bold">Wettbewerb</th>
                {COMPETITORS.map((name) => (
                  <th key={name} className="px-3 py-2 text-right font-bold">
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((row) => {
                const active = selected === row.industry;
                const share =
                  row.companies > 0 ? Math.round((row.competitor / row.companies) * 100) : 0;
                return (
                  <tr key={row.industry} className={active ? 'bg-surface' : undefined}>
                    <th scope="row" className="px-5 py-1.5 text-left font-normal">
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => onSelect(active ? 'all' : row.industry)}
                        className={`text-left hover:underline ${active ? 'font-bold' : ''}`}
                      >
                        {row.industry}
                      </button>
                    </th>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {formatInt(row.companies)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      <strong>{formatInt(row.competitor)}</strong>{' '}
                      <span className="text-xs text-muted">{share} %</span>
                    </td>
                    {COMPETITORS.map((name) => {
                      const value = row.byCompetitor[name] ?? 0;
                      return (
                        <td
                          key={name}
                          className="relative px-3 py-1.5 text-right tabular-nums"
                          title={`${row.industry} · ${name}: ${formatInt(value)}`}
                        >
                          {value > 0 && (
                            <span
                              aria-hidden
                              className="absolute inset-0.5 rounded bg-brand-primary"
                              style={{ opacity: 0.1 + 0.5 * (value / max) }}
                            />
                          )}
                          <span className={`relative ${value > 0 ? 'font-bold' : 'text-muted'}`}>
                            {value > 0 ? formatInt(value) : '–'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length > INITIAL_ROWS && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="w-full border-t border-border px-5 py-2 text-left text-xs font-bold text-brand-ink hover:bg-surface"
            >
              {expanded
                ? 'Weniger Branchen zeigen'
                : `Alle ${formatInt(rows.length)} Branchen zeigen`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
