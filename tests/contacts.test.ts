import { describe, expect, it } from 'vitest';
import { AppDatabase } from '@/data/db';
import { DexieContactRepository, InMemoryContactRepository } from '@/data/contactRepository';
import {
  EMPTY_CONTACT_DRAFT,
  latestContactByLead,
  toContactUpdate,
  validateContactDraft,
} from '@/domain/contacts';
import { CSV_BOM, contactsToCsv } from '@/domain/export';
import type { ContactUpdate } from '@/domain/types';

const LEAD = { id: 'L-1', name: 'Metallbau Beispiel GmbH' };

function makeContact(overrides: Partial<ContactUpdate> = {}): ContactUpdate {
  return {
    id: 'C-1',
    leadId: 'L-1',
    leadName: 'Metallbau Beispiel GmbH',
    name: 'Erika Beispiel',
    role: 'Leitung Einkauf',
    directDial: '+49 421 000000-12',
    email: 'einkauf@beispiel.example',
    source: 'call',
    capturedAt: '2026-10-07T09:00:00.000Z',
    ...overrides,
  };
}

describe('validateContactDraft', () => {
  it('verlangt mindestens ein Feld', () => {
    expect(validateContactDraft(EMPTY_CONTACT_DRAFT)).toBe('empty');
    expect(validateContactDraft({ ...EMPTY_CONTACT_DRAFT, name: '   ' })).toBe('empty');
    expect(validateContactDraft({ ...EMPTY_CONTACT_DRAFT, role: 'Werksleitung' })).toBeNull();
  });

  it('prüft Durchwahl und E-Mail', () => {
    expect(validateContactDraft({ ...EMPTY_CONTACT_DRAFT, directDial: 'abc' })).toBe('directDial');
    expect(
      validateContactDraft({ ...EMPTY_CONTACT_DRAFT, directDial: '0421 / 123-45' }),
    ).toBeNull();
    expect(validateContactDraft({ ...EMPTY_CONTACT_DRAFT, email: 'keine-adresse' })).toBe('email');
    expect(validateContactDraft({ ...EMPTY_CONTACT_DRAFT, email: 'a@b.example' })).toBeNull();
  });
});

describe('toContactUpdate', () => {
  it('bereinigt Leerzeichen, setzt leere Felder auf null und schreibt E-Mails klein', () => {
    const contact = toContactUpdate(
      {
        name: '  Erika   Beispiel ',
        role: '',
        directDial: ' 0421 123 ',
        email: 'Einkauf@Beispiel.Example',
      },
      LEAD,
      'C-9',
      '2026-10-07T10:00:00.000Z',
    );
    expect(contact).toEqual({
      id: 'C-9',
      leadId: 'L-1',
      leadName: 'Metallbau Beispiel GmbH',
      name: 'Erika Beispiel',
      role: null,
      directDial: '0421 123',
      email: 'einkauf@beispiel.example',
      source: 'call',
      capturedAt: '2026-10-07T10:00:00.000Z',
    });
  });
});

describe('latestContactByLead', () => {
  it('liefert je Lead den jüngsten Kontakt', () => {
    const latest = latestContactByLead([
      makeContact({ id: 'a', capturedAt: '2026-10-07T09:00:00Z' }),
      makeContact({ id: 'b', capturedAt: '2026-10-07T11:00:00Z' }),
      makeContact({ id: 'c', leadId: 'L-2', capturedAt: '2026-10-07T08:00:00Z' }),
    ]);
    expect(latest.get('L-1')?.id).toBe('b');
    expect(latest.get('L-2')?.id).toBe('c');
  });
});

describe('contactsToCsv', () => {
  it('schreibt Kopfzeile, Semikolon, CRLF und BOM', () => {
    const csv = contactsToCsv([makeContact({ role: 'Einkauf; Technik', email: null })]);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    const lines = csv.slice(CSV_BOM.length).split('\r\n');
    expect(lines[0]).toBe(
      'Erfasst am;Lead-ID;Firma;Ansprechpartner;Funktion;Durchwahl;E-Mail;Quelle',
    );
    expect(lines[1]).toBe(
      '2026-10-07T09:00:00.000Z;L-1;Metallbau Beispiel GmbH;Erika Beispiel;"Einkauf; Technik";+49 421 000000-12;;Anruf',
    );
    expect(lines[2]).toBe('');
  });
});

describe.each([
  ['Dexie', () => new DexieContactRepository(new AppDatabase(`contacts-${Math.random()}`))],
  ['InMemory', () => new InMemoryContactRepository()],
])('%s-Kontaktablage', (_name, create) => {
  it('speichert, listet chronologisch und leert', async () => {
    const repo = create();
    await repo.add(makeContact({ id: 'b', capturedAt: '2026-10-07T11:00:00Z' }));
    await repo.add(makeContact({ id: 'a', capturedAt: '2026-10-07T09:00:00Z' }));
    expect((await repo.list()).map((c) => c.id)).toEqual(['a', 'b']);
    await repo.clear();
    expect(await repo.list()).toEqual([]);
  });
});
