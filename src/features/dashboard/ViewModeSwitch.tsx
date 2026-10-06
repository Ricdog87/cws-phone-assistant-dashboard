export type ViewMode = 'list' | 'cards';

const OPTIONS: { mode: ViewMode; label: string }[] = [
  { mode: 'list', label: 'Liste' },
  { mode: 'cards', label: 'Kacheln' },
];

/** Umschalter zwischen Rangliste und Kacheln */
export function ViewModeSwitch({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange(mode: ViewMode): void;
}) {
  return (
    <div
      role="group"
      aria-label="Darstellung"
      className="flex rounded border border-border bg-panel p-0.5"
    >
      {OPTIONS.map((option) => {
        const active = option.mode === mode;
        return (
          <button
            key={option.mode}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.mode)}
            className={`rounded px-3 py-1 text-xs font-bold ${
              active ? 'bg-brand-ink text-on-primary' : 'text-brand-ink hover:bg-surface'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
