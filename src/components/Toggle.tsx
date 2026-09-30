import { useId } from 'react';

interface ToggleProps {
  label: string;
  checked: boolean;
  hint?: string;
  onChange(checked: boolean): void;
}

export function Toggle({ label, checked, hint, onChange }: ToggleProps) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[var(--brand-primary)]"
      />
      <div>
        <label htmlFor={id} className="text-sm font-bold">
          {label}
        </label>
        {hint && <div className="text-xs text-muted">{hint}</div>}
      </div>
    </div>
  );
}
