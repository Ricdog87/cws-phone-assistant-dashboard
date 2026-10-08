import { useId } from 'react';
import { useOwnerCounts } from '@/app/selectors';
import { useAppStore } from '@/app/store';
import { formatInt } from '@/components/format';
import { hunterByName } from '@/data/hunters';

const ALL = '';

/**
 * Hunter (Sales Rep), dessen Leadliste angerufen wird. Die Telefonassistenz sieht ihre
 * Zuordnung nur; ändern kann sie die Teamleitung. Die Führung kann frei wählen.
 */
export function HunterSelect() {
  const ownerFilter = useAppStore((s) => s.ownerFilter);
  const viewLevel = useAppStore((s) => s.viewLevel);
  const setOwnerFilter = useAppStore((s) => s.setOwnerFilter);
  const owners = useOwnerCounts();
  const total = owners.reduce((sum, item) => sum + item.count, 0);
  const id = useId();

  if (viewLevel === 'assistant') {
    const assigned = owners.find((item) => item.owner === ownerFilter);
    const area = hunterByName(ownerFilter)?.area;
    return (
      <p className="text-xs" aria-label="Zugeordneter Hunter">
        <span className="text-muted">Hunter </span>
        {ownerFilter ? (
          <>
            <strong>{ownerFilter}</strong>
            {area && <span className="text-muted"> · {area}</span>}
            {assigned && <span className="text-muted"> ({formatInt(assigned.count)})</span>}
          </>
        ) : (
          <strong>nicht zugeordnet, alle Leads</strong>
        )}
        <span className="block text-muted">Zuordnung durch die Teamleitung</span>
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-xs text-muted">
        Hunter
      </label>
      <select
        id={id}
        value={ownerFilter ?? ALL}
        onChange={(event) => setOwnerFilter(event.target.value === ALL ? null : event.target.value)}
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
