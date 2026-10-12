import { useMemo } from 'react';
import { useCallDay } from '@/app/selectors';
import { useAppStore } from '@/app/store';
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

  const { workday } = useCallDay();
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
      className="border-b border-border bg-panel px-4 py-2 md:px-6"
    >
      <div className="grid items-center gap-x-8 gap-y-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <div className="min-w-0">
          <h2 className="text-base font-bold leading-tight">
            {greeting(agentName)}{' '}
            <span className="text-xs font-normal capitalize text-muted">· {dateLabel}</span>
          </h2>
          <p className="truncate text-sm text-muted">{motivationLine(progress, workday)}</p>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <GoalCompact
            title="Tagesziel"
            subtitle="Anrufe heute"
            progress={progress.callsToday}
            barClassName={progress.callsToday.reached ? 'bg-brand-ink' : 'bg-brand-primary'}
          />
          <GoalCompact
            title="Wochenziel"
            subtitle="Termine diese Woche"
            progress={progress.appointmentsThisWeek}
            barClassName={
              progress.appointmentsThisWeek.reached ? 'bg-brand-ink' : 'bg-brand-primary'
            }
          />
        </div>
      </div>
    </section>
  );
}

/** Ziel in einer Zeile: Titel, Stand und Rest, darunter ein schmaler Balken */
function GoalCompact({
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
  const width = Math.min(100, (progress.current / Math.max(progress.target, 1)) * 100);
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-xs text-muted">
        <span className="min-w-0 truncate">
          <span className="font-bold uppercase tracking-wide">{title}</span> · {subtitle}
        </span>
        <span className="whitespace-nowrap">
          <strong className="text-base tabular-nums leading-none text-brand-ink">
            {progress.current}
          </strong>{' '}
          / {progress.target} ·{' '}
          <span className="font-bold text-brand-ink">
            {progress.reached ? 'Ziel erreicht' : `noch ${progress.remaining}`}
          </span>
        </span>
      </div>
      <div
        className="mt-1 h-1.5 rounded bg-surface"
        role="meter"
        aria-label={subtitle}
        aria-valuemin={0}
        aria-valuemax={Math.max(progress.target, 1)}
        aria-valuenow={progress.current}
      >
        <div className={`h-1.5 rounded ${barClassName}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
