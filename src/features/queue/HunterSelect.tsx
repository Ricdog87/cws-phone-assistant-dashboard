import { useId } from 'react';
import { useOwnerCounts } from '@/app/selectors';
import { useAppStore } from '@/app/store';
import { formatInt } from '@/components/format';
import { hunterByName } from '@/data/hunters';
import { LIVE_ASSISTANT_ID } from '@/data/demoTeam';

const ALL = '';

/**
 * Auswahl des Hunters (Sales Rep), dessen Leadliste angerufen wird. Für die
 * Telefonassistenz ist das zugleich ihre Zuordnung, die Teamleitung sieht sie im Dashboard.
 */
export function HunterSelect() {
  const ownerFilter = useAppStore((s) => s.ownerFilter);
  const viewLevel = useAppStore((s) => s.viewLevel);
  const setOwnerFilter = useAppStore((s) => s.setOwnerFilter);
  const setAssignment = useAppStore((s) => s.setAssignment);
  const owners = useOwnerCounts();
  const total = owners.reduce((sum, item) => sum + item.count, 0);
  const id = useId();

  function choose(value: string) {
    const owner = value === ALL ? null : value;
    if (viewLevel === 'assistant') setAssignment(LIVE_ASSISTANT_ID, owner);
    else setOwnerFilter(owner);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-xs text-muted">
        Hunter
      </label>
      <select
        id={id}
        value={ownerFilter ?? ALL}
        onChange={(event) => choose(event.target.value)}
        className="min-w-0 max-w-[18rem] rounded border border-border bg-panel px-2 py-1 text-xs font-bold"
      >
        <option value={ALL}>Alle Hunter ({formatInt(total)})</option>
        {owners.map((item) => {
          const area = hunterByName(item.owner)?.area;
          return (
            <option key={item.owner} value={item.owner}>
              {item.owner}
              {area ? ` · ${area}` : ''} ({formatInt(item.count)})
            </option>
          );
        })}
      </select>
    </div>
  );
}
