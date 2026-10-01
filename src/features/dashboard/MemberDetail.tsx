import { useEffect, useId, useRef } from 'react';
import { Button } from '@/components/Button';
import { formatInt } from '@/components/format';
import type { MemberStanding } from '@/domain/standings';
import { LiveTag, ThinBar } from './AssistantBrick';
import { noun } from './memberFormat';

interface MemberDetailProps {
  id: string;
  member: MemberStanding;
  /** Team oder Region, in der die Person steht */
  groupLabel: string;
  onClose(): void;
}

function GoalMetric({ label, value, goal }: { label: string; value: number; goal: number }) {
  const reached = value >= goal;
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums leading-none">
        <span className={reached ? 'text-brand-ink' : 'text-brand-primary'}>
          {formatInt(value)}
        </span>
        <span className="text-base font-normal text-muted"> von {formatInt(goal)}</span>
      </p>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={value}
      >
        <ThinBar value={value} goal={goal} reached={reached} />
      </div>
    </div>
  );
}

/** Kennzahlen einer Person aus MemberStanding, ohne Leads und ohne Scoring. */
export function MemberDetail({ id, member, groupLabel, onClose }: MemberDetailProps) {
  const headingId = useId();
  const ref = useRef<HTMLElement>(null);
  const weekReached = member.weekAppointments >= member.weeklyAppointmentGoal;

  // Beim Öffnen und beim Wechsel der Person in den sichtbaren Bereich holen
  useEffect(() => {
    ref.current?.scrollIntoView?.({ block: 'nearest' });
  }, [member.id]);

  return (
    <section
      ref={ref}
      id={id}
      aria-labelledby={headingId}
      className="rounded-lg border border-brand-ink bg-panel p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 id={headingId} className="truncate text-lg font-bold">
              {member.fullName}
            </h3>
            {member.live && <LiveTag />}
          </div>
          <p className="text-sm text-muted">{groupLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted sm:inline">Esc schließt</span>
          <Button onClick={onClose}>Schließen</Button>
        </div>
      </div>

      <p
        className={`mt-4 text-sm font-bold ${weekReached ? 'text-brand-ink' : 'text-brand-primary'}`}
        role="status"
      >
        {weekReached
          ? 'Wochenziel erreicht'
          : `Lücke zum Wochenziel: ${formatInt(member.appointmentsRemaining)} ${noun(member.appointmentsRemaining, 'Termin', 'Termine')}`}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <GoalMetric
          label="Termine diese Woche"
          value={member.weekAppointments}
          goal={member.weeklyAppointmentGoal}
        />
        <GoalMetric label="Anrufe heute" value={member.dayCalls} goal={member.dailyCallGoal} />
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted">Anrufe diese Woche</dt>
          <dd className="mt-1 text-lg font-bold tabular-nums">{formatInt(member.weekCalls)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Verbleibende Termine</dt>
          <dd className="mt-1 text-lg font-bold tabular-nums">
            {formatInt(member.appointmentsRemaining)}{' '}
            <span className="text-sm font-normal text-muted">
              {noun(member.appointmentsRemaining, 'Termin', 'Termine')}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Verbleibende Anrufe heute</dt>
          <dd className="mt-1 text-lg font-bold tabular-nums">
            {formatInt(member.dayCallsRemaining)}{' '}
            <span className="text-sm font-normal text-muted">
              {noun(member.dayCallsRemaining, 'Anruf', 'Anrufe')}
            </span>
          </dd>
        </div>
      </dl>
    </section>
  );
}
