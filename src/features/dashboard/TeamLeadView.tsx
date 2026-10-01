import { daypartGreeting, DEMO_PERSONAS } from '@/app/demoUser';
import { StatTile } from '@/components/StatTile';
import { formatInt, formatOne } from '@/components/format';
import { AssistantBrick } from './AssistantBrick';
import { MemberDetail } from './MemberDetail';
import { useCardSelection } from './useCardSelection';
import { useTeamStanding } from './useTeamStanding';

export function TeamLeadView() {
  const team = useTeamStanding();
  const lead = DEMO_PERSONAS.teamLead;
  const appointmentGap = Math.max(0, team.weeklyAppointmentGoal - team.weekAppointments);
  const { selectedKey, toggle, close, cardRef } = useCardSelection();
  const selected = team.members.find((member) => member.id === selectedKey);
  const detailId = 'team-member-detail';

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <div>
          <h2 className="text-xl font-bold">
            {daypartGreeting()}, {lead.givenName}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Team {team.teamName} · {formatInt(team.headcount)} Telefonassistenzen. Nur Anrufe und
            Termine.
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
          />
          <StatTile
            label="Anrufe heute"
            value={`${formatInt(team.dayCalls)} von ${formatInt(team.dailyCallGoal)}`}
            hint={`${formatInt(team.underDailyGoal)} unter dem Tagesziel`}
          />
          <StatTile
            label="Im Wochenziel"
            value={`${formatInt(team.atWeeklyGoal)} von ${formatInt(team.headcount)}`}
            hint={`${formatOne(team.appointmentsPer100)} Termine je 100 Anrufe`}
          />
        </div>

        {selected && (
          <MemberDetail
            id={detailId}
            member={selected}
            groupLabel={`Team ${team.teamName}`}
            onClose={close}
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {team.members.map((member) => (
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
      </div>
    </div>
  );
}
