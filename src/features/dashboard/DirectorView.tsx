import { useCallback, useState } from 'react';
import { DEMO_PERSONAS } from '@/app/demoUser';
import type { MemberStanding } from '@/domain/standings';
import { StatTile } from '@/components/StatTile';
import { formatInt, formatOne } from '@/components/format';
import { BoardHeader } from './BoardHeader';
import { BoardSections, type BoardSection } from './BoardSections';
import { progressPercent } from './memberFormat';
import { RegionTable } from './RegionTable';
import { SectionTitle } from './SectionTitle';
import type { AppointmentFilter } from './TeamAppointmentsTable';
import { useBoardFocus, type BoardFocus } from './useBoardFocus';
import { useRegionBoard } from './useRegionBoard';
import { useDirectorStanding } from './useTeamStanding';

const NO_MEMBERS: readonly MemberStanding[] = [];

export function DirectorView() {
  const { regions, standing } = useDirectorStanding();
  const director = DEMO_PERSONAS.director;
  const appointmentGap = Math.max(0, standing.weeklyAppointmentGoal - standing.weekAppointments);
  const { focus, select } = useBoardFocus();
  const [section, setSection] = useState<BoardSection>('team');
  const [appointmentFilter, setAppointmentFilter] = useState<AppointmentFilter>('all');
  const [regionId, setRegionId] = useState<string>(regions[0]?.id ?? '');

  const region = regions.find((item) => item.id === regionId) ?? regions[0];
  const board = useRegionBoard(region?.id ?? '', region?.standing.members ?? NO_MEMBERS);
  // Schlüssel aus Region und Person, damit die Auswahl in ihrer Region bleibt
  const keyOf = useCallback((memberId: string) => `${region?.id ?? ''}:${memberId}`, [region?.id]);

  function focusTeam(next: Exclude<BoardFocus, 'all'>) {
    select(next);
    setSection('team');
  }

  return (
    <div className="h-full overflow-y-auto bg-surface">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <BoardHeader
          eyebrow={`${director.role} · Vertriebsgebiet Nordwest`}
          title={director.fullName}
          subtitle={`${formatInt(standing.teamCount)} Regionen · ${formatInt(standing.headcount)} Telefonassistenzen · Teamleitungen ${regions.map((item) => item.leadName).join(' und ')}`}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatTile
            label="Termine diese Woche"
            value={formatInt(standing.weekAppointments)}
            suffix={`von ${formatInt(standing.weeklyAppointmentGoal)}`}
            hint={
              appointmentGap === 0 ? 'Ziel erreicht' : `Lücke ${formatInt(appointmentGap)} Termine`
            }
            pressed={focus === 'weekGap'}
            onSelect={() => focusTeam('weekGap')}
            filterLabel="Personen mit offenen Terminen zeigen"
            fillPercent={progressPercent(standing.weekAppointments, standing.weeklyAppointmentGoal)}
            fillReached={appointmentGap === 0}
          />
          <StatTile
            label="Anrufe heute"
            value={formatInt(standing.dayCalls)}
            suffix={`von ${formatInt(standing.dailyCallGoal)}`}
            hint={`${formatInt(standing.underDailyGoal)} unter dem Tagesziel`}
            pressed={focus === 'dayGap'}
            onSelect={() => focusTeam('dayGap')}
            filterLabel="Personen unter dem Tagesziel zeigen"
            fillPercent={progressPercent(standing.dayCalls, standing.dailyCallGoal)}
            fillReached={standing.dayCalls >= standing.dailyCallGoal}
          />
          <StatTile
            label="Im Wochenziel"
            value={formatInt(standing.atWeeklyGoal)}
            suffix={`von ${formatInt(standing.headcount)}`}
            hint={`${formatOne(standing.appointmentsPer100)} Termine je 100 Anrufe`}
            pressed={focus === 'weekHit'}
            onSelect={() => focusTeam('weekHit')}
            filterLabel="Personen im Wochenziel zeigen"
            fillPercent={progressPercent(standing.atWeeklyGoal, standing.headcount)}
            fillReached={standing.atWeeklyGoal === standing.headcount}
          />
        </div>

        <section className="space-y-3" aria-label="Regionen im Vergleich">
          <SectionTitle
            title="Regionen im Vergleich"
            aside={
              <span className="text-xs text-muted">Klick auf eine Region zeigt ihre Rangliste</span>
            }
          />
          <RegionTable
            regions={regions}
            total={standing}
            selectedRegionId={region?.id ?? ''}
            onSelect={setRegionId}
          />
        </section>

        {region && (
          <section className="space-y-3" aria-label={`Region ${region.name}`}>
            <SectionTitle title={`Region ${region.name} · ${region.leadName}`} />
            <BoardSections
              regionId={region.id}
              groupLabel={`Region ${region.name}`}
              members={region.standing.members}
              board={board}
              focus={focus}
              section={section}
              onSection={setSection}
              appointmentFilter={appointmentFilter}
              onAppointmentFilter={setAppointmentFilter}
              keyOf={keyOf}
              detailId="director-member-detail"
              compact
            />
          </section>
        )}
      </div>
    </div>
  );
}
