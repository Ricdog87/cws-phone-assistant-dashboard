import { useId } from 'react';

interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  valueLabel: string;
  hint?: string;
  onChange(value: number): void;
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  valueLabel,
  hint,
  onChange,
}: RangeFieldProps) {
  const id = useId();
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-bold">
          {label}
        </label>
        <span className="text-sm tabular-nums">{valueLabel}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--brand-primary)]"
      />
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}
