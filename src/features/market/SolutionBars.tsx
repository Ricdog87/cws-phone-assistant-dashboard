import { formatInt } from '@/components/format';
import type { SolutionChoice, SolutionSlice } from '@/domain/market';

interface SolutionBarsProps {
  slices: readonly SolutionSlice[];
  /** Firmen der Auswahl, Basis für den Anteil */
  total: number;
  selected: SolutionChoice;
  onSelect(choice: SolutionChoice): void;
}

/**
 * Firmen je Wettbewerber und je übriger Lösung als Balken. Wettbewerber dunkel, übrige
 * Lösungen grau; ein Klick filtert die ganze Ansicht, ein zweiter hebt den Filter auf.
 */
export function SolutionBars({ slices, total, selected, onSelect }: SolutionBarsProps) {
  const max = Math.max(1, ...slices.map((slice) => slice.count));
  const groups = [
    { title: 'Wettbewerb (Mietservice)', items: slices.filter((slice) => slice.competitor) },
    { title: 'Andere Lösungen', items: slices.filter((slice) => !slice.competitor) },
  ];

  return (
    <section aria-label="Aktuelle Lösung" className="rounded-lg border border-border bg-panel p-5">
      <h3 className="text-sm font-bold">Aktuelle Lösung</h3>
      <p className="mt-0.5 text-xs text-muted">
        Firmen je Wettbewerber und Lösung aus dem jüngsten Gespräch. Klick filtert.
      </p>
      {groups.map((group) => (
        <div key={group.title} className="mt-4">
          <p className="mb-1 px-2 text-xs font-bold uppercase tracking-wide text-muted">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = selected === item.choice;
              const share = total > 0 ? Math.round((item.count / total) * 100) : 0;
              return (
                <li key={item.choice}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSelect(active ? 'all' : item.choice)}
                    title={`${item.label}: ${formatInt(item.count)} Firmen, ${share} %`}
                    className={`grid w-full grid-cols-[12.5rem_minmax(0,1fr)_5.5rem] items-center gap-3 rounded px-2 py-1.5 text-left text-sm hover:bg-surface ${
                      active ? 'bg-surface font-bold ring-1 ring-brand-ink' : ''
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    <span className="block h-3" aria-hidden>
                      <span
                        className={`block h-3 rounded-r ${item.competitor ? 'bg-brand-ink' : 'bg-muted'}`}
                        style={{ width: `${(item.count / max) * 100}%` }}
                      />
                    </span>
                    <span className="text-right text-xs tabular-nums text-muted">
                      <strong className="text-sm text-brand-ink">{formatInt(item.count)}</strong> ·{' '}
                      {share} %
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
