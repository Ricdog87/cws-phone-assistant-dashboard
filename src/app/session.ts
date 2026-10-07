import { DEMO_PERSONAS, VIEW_LEVELS, VIEW_LEVEL_LABELS, type ViewLevel } from './demoUser';

/**
 * Simulierte Anmeldung per Single Sign-on für Vorführungen.
 * Es werden keine Zugangsdaten abgefragt. Später ersetzt das Firmen-Login diese Datei.
 */
export interface DemoAccount {
  level: ViewLevel;
  givenName: string;
  familyName: string;
  fullName: string;
  /** Beispieladresse auf der reservierten Domain cws.example */
  email: string;
  role: string;
  scope: string;
  /** Was diese Rolle sieht, für die Anzeige beim Anmelden */
  access: string;
}

const SCOPES: Record<ViewLevel, { scope: string; access: string }> = {
  assistant: { scope: 'Team Nord', access: 'Anrufliste, Briefing und eigene Ziele' },
  teamLead: { scope: 'Region Nord', access: 'Team Nord, 15 Personen, Anrufe und Termine' },
  director: { scope: 'Deutschland', access: 'Regionen Nord und Süd, Vergleich und Ranglisten' },
};

function emailOf(givenName: string, familyName: string): string {
  const local = `${givenName}.${familyName}`
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
  return `${local}@cws.example`;
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = VIEW_LEVELS.map((level) => {
  const person = DEMO_PERSONAS[level];
  return {
    level,
    givenName: person.givenName,
    familyName: person.familyName,
    fullName: person.fullName,
    email: emailOf(person.givenName, person.familyName),
    role: VIEW_LEVEL_LABELS[level],
    ...SCOPES[level],
  };
});

export function accountFor(level: ViewLevel): DemoAccount {
  return (
    DEMO_ACCOUNTS.find((account) => account.level === level) ?? (DEMO_ACCOUNTS[0] as DemoAccount)
  );
}

export const SESSION_STORAGE_KEY = 'cws-lead-cockpit-demo-session';

function isViewLevel(value: unknown): value is ViewLevel {
  return typeof value === 'string' && (VIEW_LEVELS as readonly string[]).includes(value);
}

/** Angemeldete Rolle dieses Browser-Tabs, null ohne Anmeldung */
export function loadSession(): ViewLevel | null {
  try {
    const value = globalThis.sessionStorage?.getItem(SESSION_STORAGE_KEY);
    return isViewLevel(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveSession(level: ViewLevel | null): void {
  try {
    if (level) globalThis.sessionStorage?.setItem(SESSION_STORAGE_KEY, level);
    else globalThis.sessionStorage?.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ohne Speicher bleibt die Anmeldung nur bis zum Neuladen bestehen
  }
}
