import { useId } from 'react';
import { useOwnerCounts } from '@/app/selectors';
import { useAppStore } from '@/app/store';
import { formatInt } from '@/components/format';

const ALL = '';

/** Auswahl der Potenzialliste: alle Hunter oder ein Accountinhaber */
export function HunterSelect() {
  const ownerFilter = useAppStore((s) => s.ownerFilter);
  const setOwnerFilter = useAppStore((s) => s.setOwnerFilter);
  const owners = useOwnerCounts();
  const total = owners.reduce((sum, item) => sum + item.count, 0);
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-xs text-muted">
        Potenzialliste
      </label>
      <select
        id={id}
        value={ownerFilter ?? ALL}
        onChange={(event) => setOwnerFilter(event.target.value === ALL ? null : event.target.value)}
        className="min-w-0 max-w-[16rem] rounded border border-border bg-panel px-2 py-1 text-xs font-bold"
      >
        <option value={ALL}>Alle Hunter ({formatInt(total)})</option>
        {owners.map((item) => (
          <option key={item.owner} value={item.owner}>
            {item.owner} ({formatInt(item.count)})
          </option>
        ))}
      </select>
    </div>
  );
}
