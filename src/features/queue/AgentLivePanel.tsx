import { useMemo } from 'react';
import { useAppStore } from '@/app/store';
import { Meter } from '@/components/Meter';
import {
  computeAgentDayProgress,
  greeting,
  motivationLine,
  type GoalProgress,
} from '@/domain/agentGoals';

/** Live-Maske der Telefonassistenz: Begrüßung und Stand gegen Tages-/Wochenziel */
export function AgentLivePanel() {
  const agentName = useAppStore((s) => s.agentName);
  const goals = useAppStore((s) => s.agentGoals);
  const outcomes = useAppStore((s) => s.outcomes);

  const progress = useMemo(
    () => computeAgentDayProgress(outcomes, goals),
    [outcomes, goals],
  );
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
      className="border-b border-border bg-panel px-4 py-3 md:px-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold leading-tight">{greeting(agentName)}</h2>
          <p className="text-sm text-muted">{motivationLine(progress)}</p>
        </div>
        <p className="text-xs capitalize text-muted">{dateLabel}</p>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <GoalCard
          title="Tagesziel"
          subtitle="Anrufe heute"
          progress={progress.callsToday}
          barClassName={progress.callsToday.reached ? 'bg-brand-primary' : 'bg-brand-ink'}
        />
        <GoalCard
          title="Wochenziel"
          subtitle="Termine diese Woche"
          progress={progress.appointmentsThisWeek}
          barClassName={
            progress.appointmentsThisWeek.reached ? 'bg-brand-primary' : 'bg-brand-ink'
          }
        />
      </div>
    </section>
  );
}

function GoalCard({
  title,
  subtitle,
  progress,
  barClassName,
}: {
  title: string;
  subtitle: string;
  progress: GoalProgress;
  barClassName: string;
}) {
  return (
    <div className="rounded border border-border bg-surface p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-muted">{title}</div>
          <div className="text-xs text-muted">{subtitle}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums leading-none">
            {progress.current}
            <span className="text-base font-normal text-muted"> / {progress.target}</span>
          </div>
          <div className="mt-0.5 text-xs tabular-nums text-muted">{progress.percent} %</div>
        </div>
      </div>
      <div className="mt-2">
        <Meter
          label={`${title}: ${subtitle}`}
          value={progress.current}
          max={Math.max(progress.target, 1)}
          valueLabel={
            progress.reached
              ? 'Ziel erreicht'
              : `noch ${progress.remaining}`
          }
          barClassName={barClassName}
        />
      </div>
    </div>
  );
}
