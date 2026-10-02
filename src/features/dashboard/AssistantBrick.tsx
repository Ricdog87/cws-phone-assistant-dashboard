import { forwardRef } from 'react';
import { userInitials } from '@/app/demoUser';
import { formatInt } from '@/components/format';
import type { MemberStanding } from '@/domain/standings';
import { noun, progressPercent } from './memberFormat';

interface AssistantBrickProps {
  member: MemberStanding;
  compact?: boolean;
  selected?: boolean;
  /** id des geöffneten Details, nur gesetzt, wenn diese Karte gewählt ist */
  detailId?: string;
  onSelect?: () => void;
}

/** Dünner Fortschritt. Ziel erreicht in --brand-ink, offen in --brand-primary. */
export function ThinBar({
  value,
  goal,
  reached,
}: {
  value: number;
  goal: number;
  reached: boolean;
}) {
  return (
    <span className="mt-2 block h-1 overflow-hidden rounded-full bg-surface" aria-hidden>
      <span
        className={`block h-1 rounded-full ${reached ? 'bg-brand-ink' : 'bg-brand-primary'}`}
        style={{ width: `${progressPercent(value, goal)}%` }}
      />
    </span>
  );
}

/** Markierung für die Person, deren Zahlen aus den erfassten Anrufen kommen */
export function LiveTag() {
  return (
    <span
      className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[11px] font-bold leading-none text-muted"
      title="Zahlen aus den in dieser Sitzung erfassten Anrufen"
    >
      erfasst
    </span>
  );
}

interface MetricProps {
  label: string;
  value: number;
  goal: number;
  hint: string;
  compact: boolean;
}

function Metric({ label, value, goal, hint, compact }: MetricProps) {
  const reached = value >= goal;
  return (
    <span className="block min-w-0">
      <span className="block text-xs text-muted">{label}</span>
      <span
        className={`mt-1 block font-bold tabular-nums leading-none ${compact ? 'text-lg' : 'text-2xl'}`}
      >
        <span className={reached ? 'text-brand-ink' : 'text-brand-primary'}>
          {formatInt(value)}
        </span>
        <span className="text-sm font-normal text-muted"> von {formatInt(goal)}</span>
      </span>
      <ThinBar value={value} goal={goal} reached={reached} />
      <span className="mt-1.5 block truncate text-xs text-muted">{hint}</span>
    </span>
  );
}

/** Eine Person als Schaltfläche, nur Anrufe und Termine. */
export const AssistantBrick = forwardRef<HTMLButtonElement, AssistantBrickProps>(
  function AssistantBrick({ member, compact = false, selected = false, detailId, onSelect }, ref) {
    const weekReached = member.weekAppointments >= member.weeklyAppointmentGoal;
    const dayReached = member.dayCalls >= member.dailyCallGoal;

    const appointmentsHint = weekReached
      ? 'Wochenziel erreicht'
      : `Noch ${formatInt(member.appointmentsRemaining)} ${noun(member.appointmentsRemaining, 'Termin', 'Termine')}`;
    const callsHint = dayReached
      ? 'Tagesziel erreicht'
      : `Noch ${formatInt(member.dayCallsRemaining)} ${noun(member.dayCallsRemaining, 'Anruf', 'Anrufe')}`;

    const state = selected
      ? 'border-brand-ink ring-1 ring-brand-ink'
      : 'border-border hover:border-muted hover:bg-surface';

    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={selected}
        aria-controls={selected ? detailId : undefined}
        aria-label={`${member.fullName}: ${formatInt(member.weekAppointments)} von ${formatInt(member.weeklyAppointmentGoal)} Terminen diese Woche, ${formatInt(member.dayCalls)} von ${formatInt(member.dailyCallGoal)} Anrufen heute${member.live ? ', erfasst' : ''}`}
        onClick={onSelect}
        className={`flex w-full cursor-pointer flex-col rounded-lg border bg-panel text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink ${state} ${compact ? 'gap-3 p-3' : 'gap-4 p-4'}`}
      >
        <span className="flex w-full items-center gap-3">
          <span
            className={`flex shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              compact ? 'h-7 w-7' : 'h-9 w-9'
            } ${selected ? 'bg-brand-ink text-on-primary' : 'border border-border bg-surface text-brand-ink'}`}
            aria-hidden
          >
            {userInitials(member.givenName, member.familyName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">{member.fullName}</span>
            <span
              className={`block text-xs font-bold ${weekReached ? 'text-brand-ink' : 'text-brand-primary'}`}
            >
              {weekReached
                ? 'im Ziel'
                : `${formatInt(member.appointmentsRemaining)} ${noun(member.appointmentsRemaining, 'Termin', 'Termine')} offen`}
            </span>
          </span>
          {member.live && <LiveTag />}
        </span>

        <span className={`grid w-full grid-cols-2 ${compact ? 'gap-3' : 'gap-5'}`}>
          <Metric
            label="Termine diese Woche"
            value={member.weekAppointments}
            goal={member.weeklyAppointmentGoal}
            hint={appointmentsHint}
            compact={compact}
          />
          <Metric
            label="Anrufe heute"
            value={member.dayCalls}
            goal={member.dailyCallGoal}
            hint={callsHint}
            compact={compact}
          />
        </span>

        {!compact && (
          <span className="block w-full border-t border-border pt-3 text-xs tabular-nums text-muted">
            {formatInt(member.weekCalls)} {noun(member.weekCalls, 'Anruf', 'Anrufe')} diese Woche
          </span>
        )}
      </button>
    );
  },
);
