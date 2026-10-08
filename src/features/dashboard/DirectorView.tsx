import { useEffect, useState } from 'react';
import { DEMO_PERSONAS } from '@/app/demoUser';
import type { MemberStanding } from '@/domain/standings';
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
import { RegionTable } from './RegionTable';
import { SectionTitle } from './SectionTitle';
import { matchesFocus, useBoardFocus } from './useBoardFocus';
import { useCardSelection } from './useCardSelection';
import { useHunterOptions, useRegionBoard } from './useRegionBoard';
import { useAppStore } from '@/app/store';
import { useDirectorStanding } from './useTeamStanding';
import { ViewModeSwitch, type ViewMode } from './ViewModeSwitch';

const NO_MEMBERS: readonly MemberStanding[] = [];

export function DirectorView() {
  const { regions, standing } = useDirectorStanding();
  const director = DEMO_PERSONAS.director;
  const appointmentGap = Math.max(0, standing.weeklyAppointmentGoal - standing.weekAppointments);
  const { focus, select } = useBoardFocus();
  const { selectedKey, toggle, close, cardRef } = useCardSelection();
  const [mode, setMode] = useState<ViewMode>('list');
  const [regionId, setRegionId] = useState<string>(regions[0]?.id ?? '');

  const region = regions.find((item) => item.id === regionId) ?? regions[0];
  const board = useRegionBoard(region?.id ?? '', region?.standing.members ?? NO_MEMBERS);
  const hunterOptions = useHunterOptions(region?.id ?? '');
  const assignments = useAppStore((s) => s.assignments);
  const setAssignment = useAppStore((s) => s.setAssignment);
  // Schlüssel aus Region und Person, damit die Auswahl in ihrer Region bleibt
  const keyOf = (memberId: string) => `${region?.id ?? ''}:${memberId}`;
  const ranked = region ? withRanks(region.standing.members) : [];
  const visible = ranked.filter(({ member }) => matchesFocus(member, focus));
  const selected = region?.standing.members.find((member) => keyOf(member.id) === selectedKey);
  const detailId = 'director-member-detail';

  // Auswahl schließen, wenn Filter oder Regionswechsel die Person ausblenden
  useEffect(() => {
    if (selectedKey === null) return;
    const [selectedRegion, memberId] = selectedKey.split(':');
    const member = region?.standing.members.find((item) => item.id === memberId);
    if (selectedRegion !== region?.id || !member || !matchesFocus(member, focus)) close();
  }, [selectedKey, focus, region, close]);

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
            onSelect={() => select('weekGap')}
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
            onSelect={() => select('dayGap')}
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
            onSelect={() => select('weekHit')}
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
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <section
              className="min-w-0 space-y-3"
              aria-label={`Potenzialliste je Hunter Region ${region.name}`}
            >
              <SectionTitle
                title={`Potenzialliste je Hunter · Region ${region.name}`}
                aside={<span className="text-xs text-muted">Wenigste Termine oben</span>}
              />
              <HunterTable rows={board.hunters} />
            </section>
            <section className="min-w-0 space-y-3" aria-label="Terminbestätigungen">
              <SectionTitle title={`Terminbestätigungen · Region ${region.name}`} />
              <ConfirmationPanel appointments={board.appointments} />
            </section>
          </div>
        )}

        {region && (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <section className="min-w-0 space-y-3" aria-label={`Rangliste Region ${region.name}`}>
              <SectionTitle
                title={`Rangliste Region ${region.name} · ${region.leadName}`}
                aside={
                  <div className="flex items-center gap-3">
                    <span className="text-xs tabular-nums text-muted">
                      {formatInt(visible.length)} von {formatInt(region.standing.headcount)}
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
                  compact
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                  {visible.map(({ member }) => (
                    <AssistantBrick
                      key={member.id}
                      ref={cardRef(keyOf(member.id))}
                      member={member}
                      compact
                      selected={keyOf(member.id) === selectedKey}
                      detailId={detailId}
                      onSelect={() => toggle(keyOf(member.id))}
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
                  groupLabel={`Region ${region.name}`}
                  assignment={{
                    hunter: assignments[selected.id] ?? null,
                    options: hunterOptions,
                    onChange: (hunter) => setAssignment(selected.id, hunter),
                  }}
                  onClose={close}
                />
              ) : (
                <AttentionPanel members={region.standing.members} keyOf={keyOf} onSelect={toggle} />
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
