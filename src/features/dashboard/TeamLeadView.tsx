import { useEffect, useState } from 'react';
import { daypartGreeting, DEMO_PERSONAS } from '@/app/demoUser';
import { StatTile } from '@/components/StatTile';
import { formatInt, formatOne } from '@/components/format';
import { AssistantBrick } from './AssistantBrick';
import { AttentionPanel } from './AttentionPanel';
import { ConfirmationPanel } from './ConfirmationPanel';
import { HunterTable } from './HunterTable';
import { BoardHeader } from './BoardHeader';
import { withRanks } from './boardRows';
import { LeaderboardTable } from './LeaderboardTable';
import { MemberDetail } from './MemberDetail';
import { progressPercent } from './memberFormat';
import { SectionTitle } from './SectionTitle';
import { matchesFocus, useBoardFocus } from './useBoardFocus';
import { useCardSelection } from './useCardSelection';
import { useRegionBoard } from './useRegionBoard';
import { useTeamStanding } from './useTeamStanding';
import { ViewModeSwitch, type ViewMode } from './ViewModeSwitch';

const keyOf = (memberId: string) => memberId;

export function TeamLeadView() {
  const team = useTeamStanding();
  const board = useRegionBoard(team.teamId, team.members);
  const lead = DEMO_PERSONAS.teamLead;
  const appointmentGap = Math.max(0, team.weeklyAppointmentGoal - team.weekAppointments);
  const { focus, select } = useBoardFocus();
  const { selectedKey, toggle, close, cardRef } = useCardSelection();
  const [mode, setMode] = useState<ViewMode>('list');
  const ranked = withRanks(team.members);
  const visible = ranked.filter(({ member }) => matchesFocus(member, focus));
  const selected = team.members.find((member) => member.id === selectedKey);
  const detailId = 'team-member-detail';

  // Gewählte Person schließen, wenn der Filter sie ausblendet
  useEffect(() => {
    if (selectedKey === null) return;
    const member = team.members.find((item) => item.id === selectedKey);
    if (!member || !matchesFocus(member, focus)) close();
  }, [selectedKey, focus, team.members, close]);

  return (
    <div className="h-full overflow-y-auto bg-surface">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <BoardHeader
          eyebrow={`Teamleitung · Region ${team.teamName}`}
          title={`${daypartGreeting()}, ${lead.givenName}`}
          subtitle={`Team ${team.teamName} · ${formatInt(team.headcount)} Telefonassistenzen · nur Anrufe und Termine`}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatTile
            label="Termine diese Woche"
            value={formatInt(team.weekAppointments)}
            suffix={`von ${formatInt(team.weeklyAppointmentGoal)}`}
            hint={
              appointmentGap === 0
                ? 'Teamziel erreicht'
                : `Noch ${formatInt(appointmentGap)} Termine bis zum Teamziel`
            }
            pressed={focus === 'weekGap'}
            onSelect={() => select('weekGap')}
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
            onSelect={() => select('dayGap')}
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
            onSelect={() => select('weekHit')}
            filterLabel="Personen im Wochenziel zeigen"
            fillPercent={progressPercent(team.atWeeklyGoal, team.headcount)}
            fillReached={team.atWeeklyGoal === team.headcount}
          />
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="min-w-0 space-y-3" aria-label="Potenzialliste je Hunter">
            <SectionTitle
              title="Potenzialliste je Hunter"
              aside={<span className="text-xs text-muted">Wenigste Termine oben</span>}
            />
            <HunterTable rows={board.hunters} />
          </section>
          <section className="min-w-0 space-y-3" aria-label="Terminbestätigungen diese Woche">
            <SectionTitle title="Terminbestätigungen" />
            <ConfirmationPanel appointments={board.appointments} />
          </section>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="min-w-0 space-y-3" aria-label="Rangliste">
            <SectionTitle
              title="Rangliste"
              aside={
                <div className="flex items-center gap-3">
                  <span className="text-xs tabular-nums text-muted">
                    {formatInt(visible.length)} von {formatInt(team.headcount)}
                    {focus !== 'all' && ' · gefiltert'}
                  </span>
                  <ViewModeSwitch mode={mode} onChange={setMode} />
                </div>
              }
            />
            {visible.length === 0 ? (
              <p className="rounded-lg border border-border bg-panel p-4 text-sm text-muted">
                Keine Person in dieser Auswahl.
              </p>
            ) : mode === 'list' ? (
              <LeaderboardTable
                rows={visible}
                keyOf={keyOf}
                selectedKey={selectedKey}
                detailId={detailId}
                cardRef={cardRef}
                onToggle={toggle}
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {visible.map(({ member }) => (
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
            )}
          </section>

          <aside className="space-y-4 xl:sticky xl:top-6">
            {selected ? (
              <MemberDetail
                id={detailId}
                member={selected}
                groupLabel={`Team ${team.teamName}`}
                onClose={close}
              />
            ) : (
              <AttentionPanel members={team.members} keyOf={keyOf} onSelect={toggle} />
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
