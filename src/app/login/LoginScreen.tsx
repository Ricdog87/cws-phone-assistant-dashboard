import { useEffect, useRef, useState } from 'react';
import { userInitials, type ViewLevel } from '../demoUser';
import { DEMO_ACCOUNTS, accountFor, type DemoAccount } from '../session';
import { useAppStore } from '../store';

type Step = 'start' | 'pick' | 'verifying';

interface LoginScreenProps {
  /** Dauer je Prüfschritt in Millisekunden, in Tests 0 */
  stepMs?: number;
}

function checksFor(account: DemoAccount): string[] {
  return [
    'Identität bestätigt',
    `Rolle erkannt: ${account.role}`,
    `Berechtigungen geladen: ${account.scope}`,
    'Ansicht wird vorbereitet',
  ];
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
      <path
        d="M3 8.5l3 3 7-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-brand-primary"
    />
  );
}

function Avatar({ account, large = false }: { account: DemoAccount; large?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-primary font-bold text-on-primary ${
        large ? 'h-12 w-12 text-base' : 'h-10 w-10 text-sm'
      }`}
    >
      {userInitials(account.givenName, account.familyName)}
    </span>
  );
}

/** Simulierte Anmeldung per Single Sign-on. Fragt keine Zugangsdaten ab. */
export function LoginScreen({ stepMs = 550 }: LoginScreenProps) {
  const signIn = useAppStore((s) => s.signIn);
  const [step, setStep] = useState<Step>('start');
  const [level, setLevel] = useState<ViewLevel | null>(null);
  const [done, setDone] = useState(0);
  const firstAccount = useRef<HTMLButtonElement>(null);
  const account = level ? accountFor(level) : null;

  useEffect(() => {
    if (step === 'pick') firstAccount.current?.focus();
  }, [step]);

  // Prüfschritte nacheinander abhaken, danach anmelden
  useEffect(() => {
    if (step !== 'verifying' || !account) return;
    const total = checksFor(account).length;
    if (done >= total) {
      const timer = setTimeout(() => signIn(account.level), stepMs);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setDone((count) => count + 1), stepMs);
    return () => clearTimeout(timer);
  }, [step, done, account, signIn, stepMs]);

  function choose(next: ViewLevel) {
    setLevel(next);
    setDone(0);
    setStep('verifying');
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-surface px-4 py-10">
      <main className="w-full max-w-md rounded-lg border border-border bg-panel p-8">
        <img
          src="/logo.png"
          alt="CWS Workwear"
          width={582}
          height={82}
          className="h-9 w-auto select-none"
          draggable={false}
        />
        <p className="mt-6 text-xs font-bold uppercase tracking-wide text-muted">
          Lead-Cockpit Nordwest · New Business
        </p>

        {step === 'start' && (
          <section aria-labelledby="login-title">
            <h1 id="login-title" className="mt-2 text-2xl font-bold">
              Anmelden
            </h1>
            <p className="mt-2 text-sm text-muted">
              Mit dem CWS-Firmenkonto per Single Sign-on. Kein separates Passwort für das Cockpit.
            </p>
            <button
              type="button"
              autoFocus
              onClick={() => setStep('pick')}
              className="mt-6 w-full rounded bg-brand-primary px-4 py-3 text-sm font-bold text-on-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"
            >
              Mit Firmenkonto anmelden (SSO)
            </button>
          </section>
        )}

        {step === 'pick' && (
          <section aria-labelledby="pick-title">
            <h1 id="pick-title" className="mt-2 text-2xl font-bold">
              Konto auswählen
            </h1>
            <p className="mt-2 text-sm text-muted">
              Die Rolle bestimmt, welche Ansicht nach der Anmeldung erscheint.
            </p>
            <ul className="mt-5 space-y-2">
              {DEMO_ACCOUNTS.map((item, index) => (
                <li key={item.level}>
                  <button
                    ref={index === 0 ? firstAccount : undefined}
                    type="button"
                    onClick={() => choose(item.level)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border bg-panel p-3 text-left transition-colors hover:border-muted hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"
                  >
                    <Avatar account={item} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">{item.fullName}</span>
                      <span className="block text-xs font-bold text-brand-ink">
                        {item.role} · {item.scope}
                      </span>
                      <span className="block truncate text-xs text-muted">{item.email}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setStep('start')}
              className="mt-4 text-sm text-muted underline hover:text-brand-ink"
            >
              Zurück
            </button>
          </section>
        )}

        {step === 'verifying' && account && (
          <section aria-labelledby="verify-title">
            <h1 id="verify-title" className="mt-2 text-2xl font-bold">
              Anmeldung läuft
            </h1>
            <div className="mt-5 flex items-center gap-3 rounded-lg border border-border p-3">
              <Avatar account={account} large />
              <span className="min-w-0">
                <span className="block font-bold">{account.fullName}</span>
                <span className="block truncate text-xs text-muted">{account.email}</span>
                <span className="block text-xs text-muted">{account.access}</span>
              </span>
            </div>
            <ol className="mt-5 space-y-2.5 text-sm" aria-live="polite">
              {checksFor(account).map((label, index) => {
                const finished = index < done;
                const running = index === done;
                if (!finished && !running) return null;
                return (
                  <li key={label} className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        finished ? 'bg-brand-ink text-on-primary' : ''
                      }`}
                    >
                      {finished ? <Check /> : <Spinner />}
                    </span>
                    <span className={finished ? 'text-brand-ink' : 'text-muted'}>{label}</span>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        <p className="mt-8 border-t border-border pt-4 text-xs text-muted">
          Demo-Anmeldung mit fiktiven Konten. Es werden keine Zugangsdaten abgefragt oder
          gespeichert.
        </p>
      </main>
    </div>
  );
}
