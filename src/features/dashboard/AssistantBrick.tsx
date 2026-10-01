import { userInitials } from '@/app/demoUser';
import { formatInt } from '@/components/format';
import type { MemberStanding } from '@/domain/standings';

interface AssistantBrickProps {
  member: MemberStanding;
  compact?: boolean;
}

function noun(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

function barWidth(value: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.max(0, Math.min(100, (value / goal) * 100));
}

/** Eine Person, nur Anrufe und Termine. */
export function AssistantBrick({ member, compact = false }: AssistantBrickProps) {
  const weekReached = member.weekAppointments >= member.weeklyAppointmentGoal;
  const dayReached = member.dayCalls >= member.dailyCallGoal;

  return (
    <article
      aria-label={member.fullName}
      className={`flex flex-col rounded border border-border bg-panel ${compact ? 'p-3' : 'p-4'}`}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-on-primary"
          aria-hidden
        >
          {userInitials(member.givenName, member.familyName)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{member.fullName}</p>
          <p className="text-xs text-muted">
            {weekReached
              ? 'Wochenziel erreicht'
              : `Noch ${formatInt(member.appointmentsRemaining)} ${noun(member.appointmentsRemaining, 'Termin', 'Termine')}`}
            {member.live ? ' · erfasst' : ''}
          </p>
        </div>
      </div>

      <p
        className={`mt-3 font-bold tabular-nums leading-tight ${compact ? 'text-lg' : 'text-2xl'}`}
      >
        <span className={weekReached ? undefined : 'text-brand-primary'}>
          {formatInt(member.weekAppointments)}
        </span>
        <span className="text-sm font-bold text-muted">
          {' '}
          von {formatInt(member.weeklyAppointmentGoal)}
        </span>
      </p>
      <p className="text-xs text-muted">Termine diese Woche</p>
      <div
        className="mt-2 h-1.5 rounded bg-surface"
        role="meter"
        aria-label={`Termine ${member.fullName}`}
        aria-valuemin={0}
        aria-valuemax={member.weeklyAppointmentGoal}
        aria-valuenow={member.weekAppointments}
      >
        <div
          className={`h-1.5 rounded ${weekReached ? 'bg-brand-ink' : 'bg-brand-primary'}`}
          style={{ width: `${barWidth(member.weekAppointments, member.weeklyAppointmentGoal)}%` }}
        />
      </div>

      <p className="mt-3 text-sm font-bold tabular-nums">
        {formatInt(member.dayCalls)} von {formatInt(member.dailyCallGoal)}
      </p>
      <p className="text-xs text-muted">
        {dayReached
          ? 'Tagesziel erreicht'
          : `Noch ${formatInt(member.dayCallsRemaining)} ${noun(member.dayCallsRemaining, 'Anruf', 'Anrufe')} heute`}
      </p>
      {!compact && (
        <p className="mt-2 text-xs text-muted">
          {formatInt(member.weekCalls)} {noun(member.weekCalls, 'Anruf', 'Anrufe')} diese Woche
        </p>
      )}
    </article>
  );
}
