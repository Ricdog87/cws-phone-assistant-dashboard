import { VIEW_LEVELS, VIEW_LEVEL_LABELS } from './demoUser';
import { useAppStore } from './store';

/** Umschalter der Demo-Ebene. Im Rollout ersetzt das Login diese Wahl. */
export function ViewLevelSwitch() {
  const level = useAppStore((s) => s.viewLevel);
  const setViewLevel = useAppStore((s) => s.setViewLevel);

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-muted sm:inline">Ansicht</span>
      <div role="group" aria-label="Demo-Ebene" className="flex rounded border border-border">
        {VIEW_LEVELS.map((id) => {
          const active = id === level;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => setViewLevel(id)}
              className={`whitespace-nowrap px-2 py-1.5 text-xs first:rounded-l last:rounded-r sm:px-3 sm:text-sm ${
                active
                  ? 'bg-brand-ink font-bold text-on-primary'
                  : 'text-brand-ink hover:bg-surface'
              }`}
            >
              {VIEW_LEVEL_LABELS[id]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
