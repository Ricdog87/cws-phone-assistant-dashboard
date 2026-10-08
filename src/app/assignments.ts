/** Zuordnung Telefonassistenz (ID) zu Hunter (Name), wie in der Aufteilung der Teamleitung */
export type Assignments = Readonly<Record<string, string>>;

export const ASSIGNMENTS_STORAGE_KEY = 'cws-lead-cockpit-zuordnung';

/** Gespeicherte Zuordnung dieses Browsers oder null. Bis zum zentralen Speicher nur lokal. */
export function loadAssignments(): Assignments | null {
  try {
    const raw = globalThis.localStorage?.getItem(ASSIGNMENTS_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    const entries = Object.entries(parsed).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    );
    return Object.fromEntries(entries);
  } catch {
    return null;
  }
}

export function saveAssignments(assignments: Assignments): void {
  try {
    globalThis.localStorage?.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(assignments));
  } catch {
    // Ohne Speicher gilt die Zuordnung nur bis zum Neuladen
  }
}
