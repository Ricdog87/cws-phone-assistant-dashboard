import type { ContactUpdate } from './types';

/** Eingabe im Formular, alle Felder als Rohtext */
export interface ContactDraft {
  name: string;
  role: string;
  directDial: string;
  email: string;
}

export const EMPTY_CONTACT_DRAFT: ContactDraft = { name: '', role: '', directDial: '', email: '' };

export type ContactDraftError = 'empty' | 'directDial' | 'email';

export const CONTACT_ERROR_LABELS: Record<ContactDraftError, string> = {
  empty: 'Mindestens ein Feld ausfüllen.',
  directDial: 'Durchwahl prüfen: nur Ziffern, Leerzeichen, +, /, - und Klammern.',
  email: 'E-Mail-Adresse prüfen.',
};

const DIAL_PATTERN = /^\+?[\d\s()/-]{6,}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: string): string | null {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed === '' ? null : trimmed;
}

/** Erster Fehler der Eingabe oder null, wenn sie gespeichert werden kann */
export function validateContactDraft(draft: ContactDraft): ContactDraftError | null {
  const name = clean(draft.name);
  const role = clean(draft.role);
  const directDial = clean(draft.directDial);
  const email = clean(draft.email);
  if (!name && !role && !directDial && !email) return 'empty';
  if (directDial && !DIAL_PATTERN.test(directDial)) return 'directDial';
  if (email && !EMAIL_PATTERN.test(email)) return 'email';
  return null;
}

/** Bereinigte Eingabe als Kontakt-Update; leere Felder werden null */
export function toContactUpdate(
  draft: ContactDraft,
  lead: { id: string; name: string },
  id: string,
  capturedAt: string,
): ContactUpdate {
  return {
    id,
    leadId: lead.id,
    leadName: lead.name,
    name: clean(draft.name),
    role: clean(draft.role),
    directDial: clean(draft.directDial),
    email: clean(draft.email)?.toLowerCase() ?? null,
    source: 'call',
    capturedAt,
  };
}

/** Jüngster erfasster Kontakt je Lead */
export function latestContactByLead(
  contacts: readonly ContactUpdate[],
): Map<string, ContactUpdate> {
  const latest = new Map<string, ContactUpdate>();
  for (const contact of contacts) {
    const current = latest.get(contact.leadId);
    if (!current || contact.capturedAt >= current.capturedAt) latest.set(contact.leadId, contact);
  }
  return latest;
}
