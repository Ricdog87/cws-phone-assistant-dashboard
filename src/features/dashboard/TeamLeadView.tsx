import { useState } from 'react';
import { daypartGreeting, DEMO_PERSONAS } from '@/app/demoUser';
import { StatTile } from '@/components/StatTile';
import { formatInt, formatOne } from '@/components/format';
import { BoardHeader } from './BoardHeader';
import { BoardSections, type BoardSection } from './BoardSections';
import { progressPercent } from './memberFormat';
import type { AppointmentFilter } from '@/domain/appointments';
import { useBoardFocus, type BoardFocus } from './useBoardFocus';
import { useRegionBoard } from './useRegionBoard';
import { useTeamStanding } from './useTeamStanding';

const keyOf = (memberId: string) => memberId;

/**
 * Teamleitung: Termine heute und diese Woche, Anrufe heute, Wochenziel; darunter ein
 * Bereich mit Team, Hunter, Terminen und Gesprächen.
 * Ein Klick auf eine Person öffnet ihre Kennzahlen mit Werdegang und Hunter-Zuordnung.
 */
export function TeamLeadView() {
  const team = useTeamStanding();
  const board = useRegionBoard(team.teamId, team.members);
  const lead = DEMO_PERSONAS.teamLead;
  const appointmentGap = Math.max(0, team.weeklyAppointmentGoal - team.weekAppointments);
  const { focus, select } = useBoardFocus();
  const [section, setSection] = useState<BoardSection>('team');
  const [appointmentFilter, setAppointmentFilter] = useState<AppointmentFilter>('week');
  const todayPressed = section === 'appointments' && appointmentFilter === 'today';

  function focusTeam(next: Exclude<BoardFocus, 'all'>) {
    select(next);
    setSection('team');
  }

  function showTodayAppointments() {
    if (todayPressed) {
      setAppointmentFilter('week');
      return;
    }
    setSection('appointments');
    setAppointmentFilter('today');
  }

  return (
    <div className="h-full overflow-y-auto bg-surface">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <BoardHeader
          eyebrow={`Teamleitung · Region ${team.teamName}`}
          title={`${daypartGreeting()}, ${lead.givenName}`}
          subtitle={`Team ${team.teamName} · ${formatInt(team.headcount)} Telefonassistenzen · ${formatInt(board.hunters.length)} Hunter`}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Termine heute"
            value={formatInt(team.dayAppointments)}
            hint={`${formatInt(team.dayCalls)} Anrufe heute im Team`}
            pressed={todayPressed}
            onSelect={showTodayAppointments}
            filterLabel="Heutige Termine zeigen"
          />
          <StatTile
            label="Termine diese Woche"
            value={formatInt(team.weekAppointments)}
            suffix={`von ${formatInt(team.weeklyAppointmentGoal)}`}
            hint={
              appointmentGap === 0
                ? 'Teamziel erreicht'
                : `Noch ${formatInt(appointmentGap)} bis zum Teamziel`
            }
            pressed={focus === 'weekGap'}
            onSelect={() => focusTeam('weekGap')}
            filterLabel="Personen mit offenen Terminen zeigen"
            fillPercent={progressPercent(team.weekAppointments, team.weeklyAppointmentGoal)}
            fillReached={appointmentGap === 0}
          />
          <StatTile
            label="Anrufe heute"
            value={formatInt(team.dayCalls)}
            suffix={`von ${formatInt(team.dailyCallGoal)}`}
            hint={`${formatInt(team.underDailyGoal)} unter dem Tagesziel`}
            pressed={focus === 'dayGap'}
            onSelect={() => focusTeam('dayGap')}
            filterLabel="Personen unter dem Tagesziel zeigen"
            fillPercent={progressPercent(team.dayCalls, team.dailyCallGoal)}
            fillReached={team.dayCalls >= team.dailyCallGoal}
          />
          <StatTile
            label="Im Wochenziel"
            value={formatInt(team.atWeeklyGoal)}
            suffix={`von ${formatInt(team.headcount)}`}
            hint={`${formatOne(team.appointmentsPer100)} Termine je 100 Anrufe`}
            pressed={focus === 'weekHit'}
            onSelect={() => focusTeam('weekHit')}
            filterLabel="Personen im Wochenziel zeigen"
            fillPercent={progressPercent(team.atWeeklyGoal, team.headcount)}
            fillReached={team.atWeeklyGoal === team.headcount}
          />
        </div>

        <BoardSections
          regionId={team.teamId}
          groupLabel={`Team ${team.teamName}`}
          members={team.members}
          board={board}
          focus={focus}
          section={section}
          onSection={setSection}
          appointmentFilter={appointmentFilter}
          onAppointmentFilter={setAppointmentFilter}
          keyOf={keyOf}
          detailId="team-member-detail"
        />
      </div>
    </div>
  );
}
