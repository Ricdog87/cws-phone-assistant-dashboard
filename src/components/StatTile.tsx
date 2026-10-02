interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  pressed?: boolean;
  onSelect?: () => void;
  fillPercent?: number;
  fillReached?: boolean;
}

export function StatTile({
  label,
  value,
  hint,
  pressed = false,
  onSelect,
  fillPercent,
  fillReached = false,
}: StatTileProps) {
  const className = `rounded border p-4 text-left ${
    pressed ? 'border-brand-ink bg-surface' : 'border-border bg-panel'
  } ${onSelect ? 'w-full cursor-pointer hover:border-muted' : ''} ${
    onSelect && !pressed ? 'hover:bg-surface' : ''
  }`;

  const body = (
    <>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums leading-none">{value}</div>
      {hint && <div className="mt-2 text-xs text-muted">{hint}</div>}
      {fillPercent !== undefined && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface" aria-hidden>
          <div
            className={`h-1 rounded-full ${fillReached ? 'bg-brand-ink' : 'bg-brand-primary'}`}
            style={{ width: `${Math.max(0, Math.min(100, fillPercent))}%` }}
          />
        </div>
      )}
    </>
  );

  if (!onSelect) return <div className={className}>{body}</div>;

  return (
    <button type="button" aria-pressed={pressed} onClick={onSelect} className={className}>
      {body}
    </button>
  );
}
