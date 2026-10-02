import { useEffect } from 'react';
import { DEMO_PERSONAS } from '@/app/demoUser';
import { Panel } from '@/components/Panel';
import { StatTile } from '@/components/StatTile';
import { formatInt, formatOne } from '@/components/format';
import { AssistantBrick, ThinBar } from './AssistantBrick';
import { MemberDetail } from './MemberDetail';
import { progressPercent } from './memberFormat';
import { matchesFocus, useBoardFocus } from './useBoardFocus';
import { useCardSelection } from './useCardSelection';
import { useDirectorStanding } from './useTeamStanding';

export function DirectorView() {
  const { regions, standing } = useDirectorStanding();
  const director = DEMO_PERSONAS.director;
  const appointmentGap = Math.max(0, standing.weeklyAppointmentGoal - standing.weekAppointments);
  const { focus, select } = useBoardFocus();
  const { selectedKey, toggle, close, cardRef } = useCardSelection();

  useEffect(() => {
    if (selectedKey === null) return;
    const splitAt = selectedKey.indexOf(':');
    const regionId = selectedKey.slice(0, splitAt);
    const memberId = selectedKey.slice(splitAt + 1);
    const region = regions.find((item) => item.id === regionId);
    const member = region?.standing.members.find((item) => item.id === memberId);
    if (!member || !matchesFocus(member, focus)) close();
  }, [selectedKey, focus, regions, close]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <div>
          <h2 className="text-xl font-bold">{director.fullName}</h2>
          <p className="mt-1 text-sm text-muted">
            Deutschland · {formatInt(standing.teamCount)} Regionen. Ein Tipp auf eine Kennzahl
            filtert beide Regionen.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Termine diese Woche"
            value={`${formatInt(standing.weekAppointments)} von ${formatInt(standing.weeklyAppointmentGoal)}`}
            hint={
              appointmentGap === 0 ? 'Ziel erreicht' : `Lücke ${formatInt(appointmentGap)} Termine`
            }
            pressed={focus === 'weekGap'}
            onSelect={() => select('weekGap')}
            fillPercent={progressPercent(standing.weekAppointments, standing.weeklyAppointmentGoal)}
            fillReached={appointmentGap === 0}
          />
          <StatTile
            label="Anrufe heute"
            value={`${formatInt(standing.dayCalls)} von ${formatInt(standing.dailyCallGoal)}`}
            hint={`${formatInt(standing.underDailyGoal)} unter dem Tagesziel`}
            pressed={focus === 'dayGap'}
            onSelect={() => select('dayGap')}
            fillPercent={progressPercent(standing.dayCalls, standing.dailyCallGoal)}
            fillReached={standing.dayCalls >= standing.dailyCallGoal}
          />
          <StatTile
            label="Im Wochenziel"
            value={`${formatInt(standing.atWeeklyGoal)} von ${formatInt(standing.headcount)}`}
            hint={`${formatOne(standing.appointmentsPer100)} Termine je 100 Anrufe`}
            pressed={focus === 'weekHit'}
            onSelect={() => select('weekHit')}
            fillPercent={progressPercent(standing.atWeeklyGoal, standing.headcount)}
            fillReached={standing.atWeeklyGoal === standing.headcount}
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
          const reached = gap === 0;
          const visible = region.standing.members.filter((member) => matchesFocus(member, focus));
          const keyOf = (memberId: string) => `${region.id}:${memberId}`;
          const selected = visible.find((member) => keyOf(member.id) === selectedKey);
          const detailId = `region-${region.id}-member-detail`;
          return (
            <Panel key={region.id} title={`Region ${region.name}`}>
              <div className="mb-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm">
                    <span className="font-bold">{region.leadName}</span>
                    <span className="text-muted"> · Teamleitung</span>
                  </p>
                  <p className="text-lg font-bold tabular-nums leading-none">
                    <span className={reached ? undefined : 'text-brand-primary'}>
                      {formatInt(region.standing.weekAppointments)}
                    </span>
                    <span className="text-sm font-normal text-muted">
                      {' '}
                      von {formatInt(region.standing.weeklyAppointmentGoal)} Termine
                    </span>
                  </p>
                </div>
                <ThinBar
                  value={region.standing.weekAppointments}
                  goal={region.standing.weeklyAppointmentGoal}
                  reached={reached}
                />
                <p className="mt-2 text-xs tabular-nums text-muted">
                  {formatInt(region.standing.dayCalls)} von{' '}
                  {formatInt(region.standing.dailyCallGoal)} Anrufe heute
                  {' · '}
                  {formatInt(visible.length)} von {formatInt(region.standing.headcount)} Personen
                  {' · '}
                  {reached ? 'Ziel erreicht' : `Lücke ${formatInt(gap)} Termine`}
                </p>
              </div>
              {selected && (
                <div className="mb-4">
                  <MemberDetail
                    id={detailId}
                    member={selected}
                    groupLabel={`Region ${region.name}`}
                    onClose={close}
                  />
                </div>
              )}
              {visible.length === 0 ? (
                <p className="text-sm text-muted">Keine Person in dieser Auswahl.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visible.map((member) => (
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
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
