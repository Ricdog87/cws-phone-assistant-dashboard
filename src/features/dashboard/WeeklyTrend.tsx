import { formatInt } from '@/components/format';
import type { WeekPoint } from '@/data/demoHistory';

interface WeeklyTrendProps {
  points: readonly WeekPoint[];
  goal: number;
}

const HEIGHT = 96;

/**
 * Werdegang: Termine je Woche als schmale Säulen mit Linie für das Wochenziel.
 * Die laufende Woche ist hervorgehoben, Werte stehen im Tooltip und in der Tabelle.
 */
export function WeeklyTrend({ points, goal }: WeeklyTrendProps) {
  const max = Math.max(goal + 1, ...points.map((point) => point.appointments));
  const goalBottom = (goal / max) * HEIGHT;
  const average =
    points.reduce((sum, point) => sum + point.appointments, 0) / Math.max(1, points.length);

  return (
    <figure className="mt-6 border-t border-border pt-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">
          Werdegang · Termine je Woche
        </span>
        <span className="text-xs text-muted">
          Ø {average.toLocaleString('de-DE', { maximumFractionDigits: 1 })} · Ziel {goal}
        </span>
      </figcaption>
      <div className="relative mt-6" style={{ height: HEIGHT }} aria-hidden>
        <div
          className="absolute inset-x-0 border-t border-dashed border-brand-ink opacity-40"
          style={{ bottom: goalBottom }}
        />
        <div className="absolute inset-0 flex items-end gap-2">
          {points.map((point) => (
            <div
              key={point.week}
              className="group relative flex h-full flex-1 items-end justify-center"
              title={`KW ${point.week}: ${point.appointments} Termine, ${formatInt(point.calls)} Anrufe`}
            >
              <div
                className={`w-full max-w-[1.75rem] rounded-t ${
                  point.current ? 'bg-brand-primary' : 'bg-brand-ink'
                }`}
                style={{ height: Math.max(2, (point.appointments / max) * HEIGHT) }}
              />
              {point.current && (
                <span className="absolute -top-5 text-xs font-bold tabular-nums">
                  {point.appointments}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex gap-2" aria-hidden>
        {points.map((point) => (
          <span key={point.week} className="flex-1 text-center text-[11px] tabular-nums text-muted">
            {point.current ? 'jetzt' : `KW ${point.week}`}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Termine und Anrufe je Kalenderwoche</caption>
        <thead>
          <tr>
            <th scope="col">Kalenderwoche</th>
            <th scope="col">Termine</th>
            <th scope="col">Anrufe</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.week}>
              <th scope="row">{point.week}</th>
              <td>{point.appointments}</td>
              <td>{point.calls}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted">
        Vorwochen in der Demo erfunden, laufende Woche echt.
      </p>
    </figure>
  );
}
