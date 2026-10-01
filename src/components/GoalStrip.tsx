import { formatInt } from './format';

interface GoalStripProps {
  dayCalls: number;
  dayAppointments: number;
  weekCalls: number;
  weekAppointments: number;
  dailyCallGoal: number;
  weeklyGoal: number;
  weekday: string;
  dateLabel: string;
  daysRemaining: number;
  weekEndLabel: string;
  className?: string;
}

interface GoalColumnProps {
  kicker: string;
  value: number;
  goal: number;
  unit: string;
  detail: string;
  meterLabel: string;
  emphasize?: boolean;
}

function labeledCount(count: number, singular: string, plural: string): string {
  return `${formatInt(count)} ${count === 1 ? singular : plural}`;
}

function callDaySentence(
  weekday: string,
  dateLabel: string,
  daysRemaining: number,
  weekEndLabel: string,
): string {
  const today = `Heute ist ${weekday}, der ${dateLabel}.`;
  if (daysRemaining <= 1) return `${today} Letzter Tag für das Wochenziel.`;
  return `${today} Noch ${daysRemaining} Tage bis Sonntag, ${weekEndLabel}.`;
}

function weeklyGoalSentence(appointments: number, goal: number): string {
  if (appointments >= goal) return 'Wochenziel erreicht.';
  const remaining = goal - appointments;
  return remaining === 1
    ? 'Noch 1 Termin bis zum Wochenziel.'
    : `Noch ${remaining} Termine bis zum Wochenziel.`;
}

function GoalColumn({
  kicker,
  value,
  goal,
  unit,
  detail,
  meterLabel,
  emphasize = false,
}: GoalColumnProps) {
  const width = goal <= 0 ? 0 : Math.max(0, Math.min(100, (value / goal) * 100));

  return (
    <div>
      <p className="text-xs text-muted">{kicker}</p>
      <p className="mt-1 text-lg font-bold tabular-nums leading-tight">
        <span className={emphasize ? 'text-brand-primary' : undefined}>{formatInt(value)}</span>
        <span className="text-sm font-bold text-muted"> von {formatInt(goal)}</span>
      </p>
      <p className="text-sm font-bold">{unit}</p>
      <div
        className="mt-2 h-2 rounded bg-surface"
        role="meter"
        aria-label={meterLabel}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={value}
      >
        <div
          className={`h-2 rounded ${emphasize ? 'bg-brand-primary' : 'bg-brand-ink'}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}

/** Tagesziel Anrufe und Wochenziel Termine. Die Zahlen kommen fertig aus der Fachlogik. */
export function GoalStrip({
  dayCalls,
  dayAppointments,
  weekCalls,
  weekAppointments,
  dailyCallGoal,
  weeklyGoal,
  weekday,
  dateLabel,
  daysRemaining,
  weekEndLabel,
  className = '',
}: GoalStripProps) {
  return (
    <section aria-label="Tages- und Wochenziel" className={className}>
      <p className="text-sm">{callDaySentence(weekday, dateLabel, daysRemaining, weekEndLabel)}</p>
      <p className="mt-1 text-sm font-bold">{weeklyGoalSentence(weekAppointments, weeklyGoal)}</p>
      <div className="mt-3 grid grid-cols-2 gap-6">
        <GoalColumn
          kicker="Heute"
          value={dayCalls}
          goal={dailyCallGoal}
          unit="Anrufe"
          detail={`${labeledCount(dayAppointments, 'Termin', 'Termine')} heute`}
          meterLabel="Anrufe heute"
        />
        <GoalColumn
          kicker="Diese Woche"
          value={weekAppointments}
          goal={weeklyGoal}
          unit="Termine"
          detail={`${labeledCount(weekCalls, 'Anruf', 'Anrufe')} diese Woche`}
          meterLabel="Termine diese Woche"
          emphasize
        />
      </div>
    </section>
  );
}
