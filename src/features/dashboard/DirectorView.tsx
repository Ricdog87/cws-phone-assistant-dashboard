import { DEMO_PERSONAS } from '@/app/demoUser';
import { Panel } from '@/components/Panel';
import { StatTile } from '@/components/StatTile';
import { formatInt, formatOne } from '@/components/format';
import { AssistantBrick } from './AssistantBrick';
import { useDirectorStanding } from './useTeamStanding';

export function DirectorView() {
  const { regions, standing } = useDirectorStanding();
  const director = DEMO_PERSONAS.director;
  const appointmentGap = Math.max(0, standing.weeklyAppointmentGoal - standing.weekAppointments);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <div>
          <h2 className="text-xl font-bold">{director.fullName}</h2>
          <p className="mt-1 text-sm text-muted">
            Deutschland · {formatInt(standing.teamCount)} Regionen, je eine Teamleitung und{' '}
            {formatInt(regions[0]?.standing.headcount ?? 0)} Telefonassistenzen.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Termine diese Woche"
            value={`${formatInt(standing.weekAppointments)} von ${formatInt(standing.weeklyAppointmentGoal)}`}
            hint={
              appointmentGap === 0 ? 'Ziel erreicht' : `Lücke ${formatInt(appointmentGap)} Termine`
            }
          />
          <StatTile
            label="Anrufe heute"
            value={`${formatInt(standing.dayCalls)} von ${formatInt(standing.dailyCallGoal)}`}
            hint={`${formatInt(standing.underDailyGoal)} unter dem Tagesziel`}
          />
          <StatTile
            label="Im Wochenziel"
            value={`${formatInt(standing.atWeeklyGoal)} von ${formatInt(standing.headcount)}`}
            hint={`${formatOne(standing.appointmentsPer100)} Termine je 100 Anrufe`}
          />
          <StatTile
            label="Teamleitungen"
            value={formatInt(regions.length)}
            hint={regions.map((region) => region.leadName).join(' · ')}
          />
        </div>

        {regions.map((region) => {
          const gap = Math.max(
            0,
            region.standing.weeklyAppointmentGoal - region.standing.weekAppointments,
          );
          return (
            <Panel key={region.id} title={`Region ${region.name}`}>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm">
                  <span className="font-bold">{region.leadName}</span>
                  <span className="text-muted"> · Teamleitung</span>
                </p>
                <p className="text-sm tabular-nums text-muted">
                  {formatInt(region.standing.weekAppointments)} von{' '}
                  {formatInt(region.standing.weeklyAppointmentGoal)} Termine
                  {' · '}
                  {formatInt(region.standing.dayCalls)} von{' '}
                  {formatInt(region.standing.dailyCallGoal)} Anrufe heute
                  {' · '}
                  {gap === 0 ? 'Ziel erreicht' : `Lücke ${formatInt(gap)} Termine`}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {region.standing.members.map((member) => (
                  <AssistantBrick key={member.id} member={member} compact />
                ))}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
