import { DEMO_PERSONAS, userInitials } from './demoUser';
import { useAppStore } from './store';

/** Sichtbares Login-Platzhalterprofil der gewählten Demo-Ebene. */
export function UserBadge() {
  const level = useAppStore((s) => s.viewLevel);
  const person = DEMO_PERSONAS[level];
  const initials = userInitials(person.givenName, person.familyName);

  return (
    <div className="flex items-center gap-2.5 rounded border border-border bg-surface px-2.5 py-1">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-on-primary"
        aria-hidden
      >
        {initials}
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-bold">{person.fullName}</span>
        <span className="block text-xs text-muted">{person.role}</span>
      </span>
    </div>
  );
}
