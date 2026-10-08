import { formatInt, formatOne } from '@/components/format';
import type { DirectorStanding } from '@/domain/standings';
import { ThinBar } from './AssistantBrick';
import type { RegionStanding } from './useTeamStanding';

interface RegionTableProps {
  regions: readonly RegionStanding[];
  total: DirectorStanding;
  selectedRegionId: string;
  onSelect(regionId: string): void;
}

interface Figures {
  dayAppointments: number;
  weekAppointments: number;
  weeklyAppointmentGoal: number;
  dayCalls: number;
  dailyCallGoal: number;
  atWeeklyGoal: number;
  headcount: number;
  appointmentsPer100: number;
}

function ProgressCell({ value, goal }: { value: number; goal: number }) {
  const reached = value >= goal;
  return (
    <div className="w-36">
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

function FigureCells({ figures }: { figures: Figures }) {
  const gap = Math.max(0, figures.weeklyAppointmentGoal - figures.weekAppointments);
  return (
    <>
      <td className="px-4 py-3 text-right font-bold tabular-nums">
        {formatInt(figures.dayAppointments)}
      </td>
      <td className="px-4 py-3">
        <ProgressCell value={figures.weekAppointments} goal={figures.weeklyAppointmentGoal} />
      </td>
      <td className="px-4 py-3">
        <ProgressCell value={figures.dayCalls} goal={figures.dailyCallGoal} />
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {formatInt(figures.atWeeklyGoal)}
        <span className="text-xs text-muted"> / {formatInt(figures.headcount)}</span>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{formatOne(figures.appointmentsPer100)}</td>
      <td
        className={`px-4 py-3 text-right font-bold tabular-nums ${
          gap === 0 ? 'text-brand-ink' : 'text-brand-primary'
        }`}
      >
        {gap === 0 ? 'Ziel erreicht' : formatInt(gap)}
      </td>
    </>
  );
}

/** Vergleich der Regionen. Ein Klick wählt die Region für die Rangliste darunter. */
export function RegionTable({ regions, total, selectedRegionId, onSelect }: RegionTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-panel">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-border text-xs text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-normal">
              Region
            </th>
            <th scope="col" className="px-4 py-3 text-right font-normal">
              Termine heute
            </th>
            <th scope="col" className="px-4 py-3 font-normal">
              Termine diese Woche
            </th>
            <th scope="col" className="px-4 py-3 font-normal">
              Anrufe heute
            </th>
            <th scope="col" className="px-4 py-3 text-right font-normal">
              Im Wochenziel
            </th>
            <th scope="col" className="px-4 py-3 text-right font-normal">
              Termine je 100 Anrufe
            </th>
            <th scope="col" className="px-4 py-3 text-right font-normal">
              Lücke Termine
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {regions.map((region) => {
            const selected = region.id === selectedRegionId;
            return (
              <tr
                key={region.id}
                onClick={() => onSelect(region.id)}
                className={`cursor-pointer transition-colors ${
                  selected ? 'bg-surface' : 'hover:bg-surface'
                }`}
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(region.id);
                    }}
                    className="rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"
                  >
                    <span className={`block font-bold ${selected ? 'underline' : ''}`}>
                      Region {region.name}
                    </span>
                    <span className="block text-xs text-muted">
                      {region.leadName} · {formatInt(region.standing.headcount)} Personen
                    </span>
                    <span className="block text-xs text-muted">{region.states}</span>
                  </button>
                </td>
                <FigureCells figures={region.standing} />
              </tr>
            );
          })}
        </tbody>
        <tfoot className="border-t-2 border-brand-ink">
          <tr>
            <th scope="row" className="px-4 py-3 text-left">
              <span className="block font-bold">Nordwest gesamt</span>
              <span className="block text-xs font-normal text-muted">
                {formatInt(total.teamCount)} Regionen · {formatInt(total.headcount)} Personen
              </span>
            </th>
            <FigureCells figures={total} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
