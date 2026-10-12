import { useMemo } from 'react';
import { useCallDay } from '@/app/selectors';
import { useAppStore } from '@/app/store';
import {
  computeAgentDayProgress,
  greeting,
  motivationLine,
  type GoalProgress,
} from '@/domain/agentGoals';

/** Live-Maske der Telefonassistenz: Begrüßung und Stand gegen Tages- und Wochenziel, gut sichtbar */
export function AgentLivePanel() {
  const agentName = useAppStore((s) => s.agentName);
  const goals = useAppStore((s) => s.agentGoals);
  const outcomes = useAppStore((s) => s.outcomes);

  const { workday, daysRemaining } = useCallDay();
  const progress = useMemo(() => computeAgentDayProgress(outcomes, goals), [outcomes, goals]);
  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    [],
  );

  return (
    <section
      aria-label="Live-Maske Telefonassistenz"
      className="border-b border-border bg-panel px-4 py-2.5 md:px-6"
    >
      <div className="grid items-center gap-x-4 gap-y-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.3fr)]">
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight">
            {greeting(agentName)}{' '}
            <span className="text-xs font-normal capitalize text-muted">· {dateLabel}</span>
          </h2>
          <p className="mt-0.5 text-sm font-bold text-brand-ink">
            {motivationLine(progress, workday)}
          </p>
        </div>
        <GoalTile
          title="Tagesziel"
          unit="Anrufe heute"
          progress={progress.callsToday}
          note={workday ? `${progress.callsToday.percent} %` : 'Wochenende'}
        />
        <GoalTile
          title="Wochenziel"
          unit="Termine diese Woche"
          progress={progress.appointmentsThisWeek}
          note={
            workday
              ? `${daysRemaining} ${daysRemaining === 1 ? 'Arbeitstag' : 'Arbeitstage'} übrig`
              : 'Woche abgeschlossen'
          }
        />
      </div>
    </section>
  );
}

/** Ziel als Kachel: große Zahl, Rest als Markierung, darunter ein kräftiger Balken */
function GoalTile({
  title,
  unit,
  progress,
  note,
}: {
  title: string;
  unit: string;
  progress: GoalProgress;
  note: string;
}) {
  const width = Math.min(100, (progress.current / Math.max(progress.target, 1)) * 100);
  return (
    <div className="min-w-0 rounded border border-border bg-surface px-4 py-2">
      <div className="flex items-center gap-3">
        <p className="whitespace-nowrap leading-none">
          <strong className="text-3xl font-bold tabular-nums text-brand-ink">
            {progress.current}
          </strong>
          <span className="text-base font-bold text-muted"> / {progress.target}</span>
        </p>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-xs font-bold uppercase tracking-wide text-brand-ink">
            {title}
          </p>
          <p className="truncate text-xs text-muted">
            {unit} · {note}
          </p>
        </div>
        <span
          className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold text-on-primary ${
            progress.reached ? 'bg-brand-ink' : 'bg-brand-primary'
          }`}
        >
          {progress.reached ? 'Ziel erreicht' : `noch ${progress.remaining}`}
        </span>
      </div>
      <div
        className="mt-2 h-2.5 rounded-full bg-border"
        role="meter"
        aria-label={unit}
        aria-valuemin={0}
        aria-valuemax={Math.max(progress.target, 1)}
        aria-valuenow={progress.current}
      >
        <div
          className={`h-2.5 rounded-full ${progress.reached ? 'bg-brand-ink' : 'bg-brand-primary'}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
