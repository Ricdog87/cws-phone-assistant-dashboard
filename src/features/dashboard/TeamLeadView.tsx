import { useEffect } from 'react';
import { daypartGreeting, DEMO_PERSONAS } from '@/app/demoUser';
import { StatTile } from '@/components/StatTile';
import { formatInt, formatOne } from '@/components/format';
import { AssistantBrick } from './AssistantBrick';
import { MemberDetail } from './MemberDetail';
import { progressPercent } from './memberFormat';
import { matchesFocus, useBoardFocus } from './useBoardFocus';
import { useCardSelection } from './useCardSelection';
import { useTeamStanding } from './useTeamStanding';

export function TeamLeadView() {
  const team = useTeamStanding();
  const lead = DEMO_PERSONAS.teamLead;
  const appointmentGap = Math.max(0, team.weeklyAppointmentGoal - team.weekAppointments);
  const { focus, select } = useBoardFocus();
  const { selectedKey, toggle, close, cardRef } = useCardSelection();
  const visible = team.members.filter((member) => matchesFocus(member, focus));
  const selected = visible.find((member) => member.id === selectedKey);
  const detailId = 'team-member-detail';

  useEffect(() => {
    if (selectedKey === null) return;
    const member = team.members.find((item) => item.id === selectedKey);
    if (!member || !matchesFocus(member, focus)) close();
  }, [selectedKey, focus, team.members, close]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <div>
          <h2 className="text-xl font-bold">
            {daypartGreeting()}, {lead.givenName}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Team {team.teamName} · {formatInt(team.headcount)} Telefonassistenzen. Ein Tipp auf eine
            Kennzahl filtert die Personen.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile
            label="Termine diese Woche"
            value={`${formatInt(team.weekAppointments)} von ${formatInt(team.weeklyAppointmentGoal)}`}
            hint={
              appointmentGap === 0
                ? 'Teamziel erreicht'
                : `Noch ${formatInt(appointmentGap)} Termine bis zum Teamziel`
            }
            pressed={focus === 'weekGap'}
            onSelect={() => select('weekGap')}
            fillPercent={progressPercent(team.weekAppointments, team.weeklyAppointmentGoal)}
            fillReached={appointmentGap === 0}
          />
          <StatTile
            label="Anrufe heute"
            value={`${formatInt(team.dayCalls)} von ${formatInt(team.dailyCallGoal)}`}
            hint={`${formatInt(team.underDailyGoal)} unter dem Tagesziel`}
            pressed={focus === 'dayGap'}
            onSelect={() => select('dayGap')}
            fillPercent={progressPercent(team.dayCalls, team.dailyCallGoal)}
            fillReached={team.dayCalls >= team.dailyCallGoal}
          />
          <StatTile
            label="Im Wochenziel"
            value={`${formatInt(team.atWeeklyGoal)} von ${formatInt(team.headcount)}`}
            hint={`${formatOne(team.appointmentsPer100)} Termine je 100 Anrufe`}
            pressed={focus === 'weekHit'}
            onSelect={() => select('weekHit')}
            fillPercent={progressPercent(team.atWeeklyGoal, team.headcount)}
            fillReached={team.atWeeklyGoal === team.headcount}
          />
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-bold">Personen</h3>
          <p className="text-xs tabular-nums text-muted">
            {formatInt(visible.length)} von {formatInt(team.headcount)}
          </p>
        </div>

        {visible.length === 0 ? (
          <p className="rounded border border-border bg-panel p-4 text-sm text-muted">
            Keine Person in dieser Auswahl.
          </p>
        ) : (
          <div className={selected ? 'flex flex-col gap-4 lg:flex-row lg:items-start' : undefined}>
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((member) => (
                <AssistantBrick
                  key={member.id}
                  ref={cardRef(member.id)}
                  member={member}
                  selected={member.id === selectedKey}
                  detailId={detailId}
                  onSelect={() => toggle(member.id)}
                />
              ))}
            </div>
            {selected && (
              <div className="lg:sticky lg:top-4 lg:w-80 lg:shrink-0">
                <MemberDetail
                  id={detailId}
                  member={selected}
                  groupLabel={`Team ${team.teamName}`}
                  onClose={close}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
