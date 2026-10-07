import { userInitials } from './demoUser';
import { accountFor } from './session';
import { useAppStore } from './store';

/** Angemeldete Person mit Abmelden. Der Rollenwechsel läuft über eine neue Anmeldung. */
export function UserBadge() {
  const level = useAppStore((s) => s.viewLevel);
  const signOut = useAppStore((s) => s.signOut);
  const account = accountFor(level);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-on-primary"
          aria-hidden
        >
          {userInitials(account.givenName, account.familyName)}
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-bold">{account.fullName}</span>
          <span className="block text-xs text-muted">
            {account.role} · {account.scope}
          </span>
        </span>
      </div>
      <button
        type="button"
        onClick={signOut}
        className="rounded border border-border px-3 py-1.5 text-xs font-bold text-brand-ink hover:border-muted hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"
      >
        Abmelden
      </button>
    </div>
  );
}
