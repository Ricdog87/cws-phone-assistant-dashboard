interface StatTileProps {
  label: string;
  value: string;
  /** Kleiner Zusatz hinter dem Wert, etwa „von 60“ */
  suffix?: string;
  hint?: string;
  pressed?: boolean;
  onSelect?: () => void;
  fillPercent?: number;
  fillReached?: boolean;
  /** Was ein Klick zeigt, als Tooltip der anklickbaren Kachel */
  filterLabel?: string;
}

export function StatTile({
  label,
  value,
  suffix,
  hint,
  pressed = false,
  onSelect,
  fillPercent,
  fillReached = false,
  filterLabel,
}: StatTileProps) {
  const className = `flex flex-col rounded-lg border p-5 text-left transition-colors ${
    pressed ? 'border-brand-ink bg-panel ring-1 ring-brand-ink' : 'border-border bg-panel'
  } ${onSelect ? 'w-full cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink' : ''} ${
    onSelect && !pressed ? 'hover:border-muted hover:bg-surface' : ''
  }`;

  const body = (
    <>
      <span className="block text-xs font-bold uppercase tracking-wide text-muted">{label}</span>
      <span className="mt-2 block text-3xl font-bold leading-none">
        {value}
        {suffix && <span className="text-base font-normal text-muted"> {suffix}</span>}
      </span>
      {fillPercent !== undefined && (
        <span className="mt-3 block h-1 overflow-hidden rounded-full bg-surface" aria-hidden>
          <span
            className={`block h-1 rounded-full ${fillReached ? 'bg-brand-ink' : 'bg-brand-primary'}`}
            style={{ width: `${Math.max(0, Math.min(100, fillPercent))}%` }}
          />
        </span>
      )}
      {hint && <span className="mt-2 block text-xs text-muted">{hint}</span>}
      {onSelect && pressed && (
        <span className="mt-3 block text-xs font-bold text-brand-ink">
          Filter aktiv · erneut tippen für alle
        </span>
      )}
    </>
  );

  if (!onSelect) return <div className={className}>{body}</div>;

  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onSelect}
      title={filterLabel}
      className={className}
    >
      {body}
    </button>
  );
}
