import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/app/store';
import { formatInt } from '@/components/format';
import type { MemberStanding } from '@/domain/standings';
import { AssistantBrick } from './AssistantBrick';
import { AttentionPanel } from './AttentionPanel';
import { withRanks } from './boardRows';
import { HunterTable } from './HunterTable';
import { LeaderboardTable } from './LeaderboardTable';
import { MemberDetail } from './MemberDetail';
import { filterAppointments, type AppointmentFilter } from '@/domain/appointments';
import { todayLocal } from '@/app/selectors';
import { AppointmentFilterSwitch, TeamAppointmentsTable } from './TeamAppointmentsTable';
import { matchesFocus, type BoardFocus } from './useBoardFocus';
import { useCardSelection } from './useCardSelection';
import { useHunterOptions, type RegionBoard } from './useRegionBoard';
import { ViewModeSwitch, type ViewMode } from './ViewModeSwitch';

export type BoardSection = 'team' | 'hunters' | 'appointments';

interface BoardSectionsProps {
  regionId: string;
  /** Team oder Region, etwa „Team Nord“ */
  groupLabel: string;
  members: readonly MemberStanding[];
  board: RegionBoard;
  /** Filter aus den Kennzahl-Kacheln */
  focus: BoardFocus;
  section: BoardSection;
  onSection(section: BoardSection): void;
  appointmentFilter: AppointmentFilter;
  onAppointmentFilter(filter: AppointmentFilter): void;
  /** Schlüssel einer Person, in der Vertriebsleitung mit Region */
  keyOf(memberId: string): string;
  detailId: string;
  compact?: boolean;
}

/**
 * Ein Bereich mit drei Ansichten statt vieler Blöcke untereinander: Team (Anrufe und
 * Termine je Person, Klick öffnet Werdegang und Hunter-Zuordnung), Hunter (Potenzialliste)
 * und Termine (heute oder Woche, Status in Salesforce). Gespräche und Wettbewerb stehen im
 * eigenen Reiter Wettbewerb.
 */
export function BoardSections({
  regionId,
  groupLabel,
  members,
  board,
  focus,
  section,
  onSection,
  appointmentFilter,
  onAppointmentFilter,
  keyOf,
  detailId,
  compact = false,
}: BoardSectionsProps) {
  const hunterOptions = useHunterOptions(regionId);
  const assignments = useAppStore((s) => s.assignments);
  const setAssignment = useAppStore((s) => s.setAssignment);
  const { selectedKey, toggle, close, cardRef } = useCardSelection();
  const [mode, setMode] = useState<ViewMode>('list');
  const visible = withRanks(members).filter(({ member }) => matchesFocus(member, focus));
  const selected = members.find((member) => keyOf(member.id) === selectedKey);
  const today = filterAppointments(board.appointments, 'today', todayLocal()).length;
  const hunterOfName = useMemo(
    () => new Map(board.hunters.flatMap((row) => row.assistants.map((name) => [name, row.hunter]))),
    [board.hunters],
  );

  // Auswahl schließen, wenn Filter oder Regionswechsel die Person ausblenden
  useEffect(() => {
    if (selectedKey === null) return;
    const member = members.find((item) => keyOf(item.id) === selectedKey);
    if (!member || !matchesFocus(member, focus)) close();
  }, [selectedKey, focus, members, keyOf, close]);

  const tabs: { id: BoardSection; label: string; count: number; note?: string }[] = [
    { id: 'team', label: 'Team', count: members.length },
    { id: 'hunters', label: 'Hunter', count: board.hunters.length },
    {
      id: 'appointments',
      label: 'Termine',
      count: board.appointments.length,
      note: `${formatInt(today)} heute`,
    },
  ];

  return (
    <div
      className={`grid items-start gap-6 ${
        section === 'team' ? 'xl:grid-cols-[minmax(0,1fr)_22rem]' : ''
      }`}
    >
      <section
        aria-label={groupLabel}
        className="min-w-0 overflow-hidden rounded-lg border border-border bg-panel"
      >
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-4">
          <div role="group" aria-label="Bereich" className="flex gap-6">
            {tabs.map((tab) => {
              const active = tab.id === section;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSection(tab.id)}
                  className={`-mb-px border-b-2 py-3 text-sm ${
                    active
                      ? 'border-brand-ink font-bold text-brand-ink'
                      : 'border-transparent text-muted hover:text-brand-ink'
                  }`}
                >
                  {tab.label}{' '}
                  <span className="tabular-nums text-muted">{formatInt(tab.count)}</span>
                  {tab.note && (
                    <span className="ml-2 rounded-full border border-brand-primary px-1.5 text-xs font-bold text-brand-primary">
                      {tab.note}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="py-2">
            {section === 'team' && (
              <div className="flex items-center gap-3">
                <span className="text-xs tabular-nums text-muted">
                  {formatInt(visible.length)} von {formatInt(members.length)}
                  {focus !== 'all' && ' · gefiltert'}
                </span>
                <ViewModeSwitch mode={mode} onChange={setMode} />
              </div>
            )}
            {section === 'hunters' && (
              <span className="text-xs text-muted">Wenigste Termine oben</span>
            )}
            {section === 'appointments' && (
              <AppointmentFilterSwitch
                appointments={board.appointments}
                filter={appointmentFilter}
                onChange={onAppointmentFilter}
              />
            )}
          </div>
        </header>

        {section === 'team' &&
          (visible.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">Keine Person in dieser Auswahl.</p>
          ) : mode === 'list' ? (
            <LeaderboardTable
              rows={visible}
              keyOf={keyOf}
              selectedKey={selectedKey}
              detailId={detailId}
              cardRef={cardRef}
              onToggle={toggle}
              hunterOf={(member) => hunterOfName.get(member.fullName) ?? null}
              compact={compact}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 2xl:grid-cols-3">
              {visible.map(({ member }) => (
                <AssistantBrick
                  key={member.id}
                  ref={cardRef(keyOf(member.id))}
                  member={member}
                  compact={compact}
                  selected={keyOf(member.id) === selectedKey}
                  detailId={detailId}
                  onSelect={() => toggle(keyOf(member.id))}
                />
              ))}
            </div>
          ))}
        {section === 'hunters' && <HunterTable rows={board.hunters} />}
        {section === 'appointments' && (
          <TeamAppointmentsTable appointments={board.appointments} filter={appointmentFilter} />
        )}
      </section>

      {section === 'team' && (
        <aside className="space-y-4 xl:sticky xl:top-6">
          {selected ? (
            <MemberDetail
              id={detailId}
              member={selected}
              groupLabel={groupLabel}
              assignment={{
                hunter: assignments[selected.id] ?? null,
                options: hunterOptions,
                onChange: (hunter) => setAssignment(selected.id, hunter),
              }}
              onClose={close}
            />
          ) : (
            <AttentionPanel members={members} keyOf={keyOf} onSelect={toggle} />
          )}
        </aside>
      )}
    </div>
  );
}
