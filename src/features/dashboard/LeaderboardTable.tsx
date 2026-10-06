import type { MouseEvent } from 'react';
import { userInitials } from '@/app/demoUser';
import { formatInt } from '@/components/format';
import { LiveTag, ThinBar } from './AssistantBrick';
import type { RankedMember } from './boardRows';
import { weekStatusLabel } from './memberFormat';

interface LeaderboardTableProps {
  rows: readonly RankedMember[];
  /** Schlüssel einer Zeile, in der Vertriebsleitung mit Region */
  keyOf(memberId: string): string;
  selectedKey: string | null;
  detailId: string;
  cardRef(key: string): (element: HTMLButtonElement | null) => void;
  onToggle(key: string): void;
  compact?: boolean;
}

function GoalCell({ value, goal }: { value: number; goal: number }) {
  const reached = value >= goal;
  return (
    <div className="w-28">
      <p className="tabular-nums leading-none">
        <span className={`font-bold ${reached ? 'text-brand-ink' : 'text-brand-primary'}`}>
          {formatInt(value)}
        </span>
        <span className="text-xs text-muted"> / {formatInt(goal)}</span>
      </p>
      <ThinBar value={value} goal={goal} reached={reached} track="bg-border" />
    </div>
  );
}

/** Rangliste der Personen, eine Zeile je Person, Klick öffnet das Detail */
export function LeaderboardTable({
  rows,
  keyOf,
  selectedKey,
  detailId,
  cardRef,
  onToggle,
  compact = false,
}: LeaderboardTableProps) {
  const cell = compact ? 'px-3 py-2' : 'px-4 py-3';

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-panel">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-border text-xs text-muted">
          <tr>
            <th scope="col" className={`${cell} w-12 font-normal`}>
              Rang
            </th>
            <th scope="col" className={`${cell} font-normal`}>
              Person
            </th>
            <th scope="col" className={`${cell} font-normal`}>
              Termine diese Woche
            </th>
            <th scope="col" className={`${cell} font-normal`}>
              Anrufe heute
            </th>
            <th scope="col" className={`${cell} text-right font-normal`}>
              Anrufe Woche
            </th>
            <th scope="col" className={`${cell} font-normal`}>
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(({ member, rank }) => {
            const key = keyOf(member.id);
            const selected = key === selectedKey;
            const reached = member.appointmentsRemaining <= 0;
            const toggle = () => onToggle(key);
            const fromButton = (event: MouseEvent) => {
              // Die Zeile reagiert ebenfalls auf Klicks, hier nur einmal auslösen
              event.stopPropagation();
              toggle();
            };
            return (
              <tr
                key={key}
                onClick={toggle}
                className={`cursor-pointer transition-colors ${
                  selected ? 'bg-surface' : 'hover:bg-surface'
                }`}
              >
                <td className={`${cell} tabular-nums text-muted`}>{rank}</td>
                <td className={cell}>
                  <button
                    ref={cardRef(key)}
                    type="button"
                    aria-pressed={selected}
                    aria-controls={selected ? detailId : undefined}
                    onClick={fromButton}
                    className="flex items-center gap-3 rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"
                  >
                    <span
                      aria-hidden
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        selected
                          ? 'bg-brand-ink text-on-primary'
                          : 'border border-border bg-surface text-brand-ink'
                      }`}
                    >
                      {userInitials(member.givenName, member.familyName)}
                    </span>
                    <span className={`font-bold ${selected ? 'underline' : ''}`}>
                      {member.fullName}
                    </span>
                    {member.live && <LiveTag />}
                  </button>
                </td>
                <td className={cell}>
                  <GoalCell value={member.weekAppointments} goal={member.weeklyAppointmentGoal} />
                </td>
                <td className={cell}>
                  <GoalCell value={member.dayCalls} goal={member.dailyCallGoal} />
                </td>
                <td className={`${cell} text-right tabular-nums`}>{formatInt(member.weekCalls)}</td>
                <td className={cell}>
                  <span
                    className={`whitespace-nowrap text-xs font-bold ${
                      reached ? 'text-brand-ink' : 'text-brand-primary'
                    }`}
                  >
                    {weekStatusLabel(member.appointmentsRemaining)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
