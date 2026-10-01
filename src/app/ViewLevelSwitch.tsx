import { VIEW_LEVELS, VIEW_LEVEL_LABELS } from './demoUser';
import { useAppStore } from './store';

/** Umschalter der Demo-Ebene. Im Rollout ersetzt das Login diese Wahl. */
export function ViewLevelSwitch() {
  const level = useAppStore((s) => s.viewLevel);
  const setViewLevel = useAppStore((s) => s.setViewLevel);

  return (
    <div role="group" aria-label="Demo-Ebene" className="flex flex-wrap gap-1">
      {VIEW_LEVELS.map((id) => {
        const active = id === level;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => setViewLevel(id)}
            className={`rounded px-3 py-1.5 text-sm font-bold ${
              active ? 'bg-brand-ink text-on-primary' : 'text-brand-ink hover:bg-surface'
            }`}
          >
            {VIEW_LEVEL_LABELS[id]}
          </button>
        );
      })}
    </div>
  );
}
