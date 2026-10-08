import { useState } from 'react';
import { daypartGreeting, DEMO_PERSONAS } from '@/app/demoUser';
import { StatTile } from '@/components/StatTile';
import { formatInt, formatOne } from '@/components/format';
import { BoardHeader } from './BoardHeader';
import { BoardSections, type BoardSection } from './BoardSections';
import { progressPercent } from './memberFormat';
import type { AppointmentFilter } from './TeamAppointmentsTable';
import { useBoardFocus, type BoardFocus } from './useBoardFocus';
import { useRegionBoard } from './useRegionBoard';
import { useTeamStanding } from './useTeamStanding';

const keyOf = (memberId: string) => memberId;

/**
 * Teamleitung: vier Kennzahlen oben, darunter ein Bereich mit Team, Hunter und Terminen.
 * Ein Klick auf eine Person öffnet ihre Kennzahlen mit Werdegang und Hunter-Zuordnung.
 */
export function TeamLeadView() {
  const team = useTeamStanding();
  const board = useRegionBoard(team.teamId, team.members);
  const lead = DEMO_PERSONAS.teamLead;
  const appointmentGap = Math.max(0, team.weeklyAppointmentGoal - team.weekAppointments);
  const { focus, select } = useBoardFocus();
  const [section, setSection] = useState<BoardSection>('team');
  const [appointmentFilter, setAppointmentFilter] = useState<AppointmentFilter>('all');
  const open = board.appointments.filter((item) => item.status === 'open').length;
  const openPressed = section === 'appointments' && appointmentFilter === 'open';

  function focusTeam(next: Exclude<BoardFocus, 'all'>) {
    select(next);
    setSection('team');
  }

  function showOpenAppointments() {
    if (openPressed) {
      setAppointmentFilter('all');
      return;
    }
    setSection('appointments');
    setAppointmentFilter('open');
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
          <StatTile
            label="Noch nicht in Salesforce"
            value={formatInt(open)}
            suffix={`von ${formatInt(board.appointments.length)}`}
            hint={open === 0 ? 'Alle Termine eingetragen' : 'Termine dieser Woche ohne Eintrag'}
            pressed={openPressed}
            onSelect={showOpenAppointments}
            filterLabel="Offene Termine zeigen"
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
