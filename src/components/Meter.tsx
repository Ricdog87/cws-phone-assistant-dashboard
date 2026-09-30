interface MeterProps {
  label: string;
  value: number;
  max?: number;
  valueLabel?: string;
  barClassName?: string;
}

/** Horizontaler Balken mit Beschriftung und Wert */
export function Meter({
  label,
  value,
  max = 100,
  valueLabel,
  barClassName = 'bg-brand-ink',
}: MeterProps) {
  const width = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span>{label}</span>
        <span className="font-bold tabular-nums">{valueLabel ?? Math.round(value)}</span>
      </div>
      <div
        className="h-2 rounded bg-surface"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(value)}
      >
        <div className={`h-2 rounded ${barClassName}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
