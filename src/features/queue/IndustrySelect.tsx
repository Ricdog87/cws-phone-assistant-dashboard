import { useId } from 'react';
import { useIndustryCounts } from '@/app/selectors';
import { useAppStore } from '@/app/store';
import { formatInt } from '@/components/format';

const ALL = '';

/** Branche der Anrufliste, etwa heute nur Metallbau; Zahl der Accounts in Klammern */
export function IndustrySelect() {
  const industryFilter = useAppStore((s) => s.industryFilter);
  const setIndustryFilter = useAppStore((s) => s.setIndustryFilter);
  const industries = useIndustryCounts();
  const total = industries.reduce((sum, item) => sum + item.count, 0);
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-xs text-muted">
        Branche
      </label>
      <select
        id={id}
        value={industryFilter ?? ALL}
        onChange={(event) =>
          setIndustryFilter(event.target.value === ALL ? null : event.target.value)
        }
        className="min-w-0 max-w-[18rem] rounded border border-border bg-panel px-2 py-1 text-xs font-bold"
      >
        <option value={ALL}>Alle Branchen ({formatInt(total)})</option>
        {industries.map((item) => (
          <option key={item.industry} value={item.industry}>
            {item.industry} ({formatInt(item.count)})
          </option>
        ))}
      </select>
    </div>
  );
}
