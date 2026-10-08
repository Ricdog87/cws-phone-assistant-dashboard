import { describe, expect, it } from 'vitest';
import {
  DexieAppointmentRepository,
  InMemoryAppointmentRepository,
} from '@/data/appointmentRepository';
import { AppDatabase } from '@/data/db';
import {
  buildConfirmationMail,
  buildIcs,
  formatSlot,
  latestAppointmentByLead,
  mailtoHref,
  nextTourDate,
  toAppointment,
  validateAppointmentDraft,
  type AppointmentDraft,
} from '@/domain/appointments';
import { CSV_BOM, appointmentsToCsv } from '@/domain/export';
import type { Appointment } from '@/domain/types';

const DRAFT: AppointmentDraft = {
  date: '2026-10-13',
  time: '10:00',
  durationMinutes: 30,
  hunterName: 'Jonas Ahlers',
  hunterEmail: 'jonas.ahlers@cws.example',
  contactName: 'Erika Beispiel',
  contactEmail: 'einkauf@beispiel.example',
};

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'A-1',
    leadId: 'L-1',
    leadName: 'Metallbau Beispiel GmbH',
    start: '2026-10-13T08:00:00.000Z',
    durationMinutes: 30,
    hunterName: 'Jonas Ahlers',
    hunterEmail: 'jonas.ahlers@cws.example',
    contactName: 'Erika Beispiel',
    contactEmail: 'einkauf@beispiel.example',
    location: 'Am Hafen 1, 26721 Emden',
    createdAt: '2026-10-08T09:00:00.000Z',
    ...overrides,
  };
}

describe('nextTourDate', () => {
  it('liefert den nächsten Tourtag ab morgen', () => {
    // 08.10.2026 ist ein Donnerstag
    expect(nextTourDate('Dienstag', '2026-10-08')).toBe('2026-10-13');
    expect(nextTourDate('Freitag', '2026-10-08')).toBe('2026-10-09');
    expect(nextTourDate('Donnerstag', '2026-10-08')).toBe('2026-10-15');
  });

  it('nimmt bei unbekanntem Wochentag den nächsten Tag', () => {
    expect(nextTourDate('Feiertag', '2026-12-31')).toBe('2027-01-01');
  });
});

describe('validateAppointmentDraft', () => {
  const now = '2026-10-08T09:00';

  it('akzeptiert einen vollständigen Termin in der Zukunft', () => {
    expect(validateAppointmentDraft(DRAFT, now)).toBeNull();
    expect(validateAppointmentDraft({ ...DRAFT, contactEmail: '' }, now)).toBeNull();
  });

  it('meldet fehlende oder ungültige Angaben', () => {
    expect(validateAppointmentDraft({ ...DRAFT, date: '' }, now)).toBe('date');
    expect(validateAppointmentDraft({ ...DRAFT, time: '' }, now)).toBe('time');
    expect(validateAppointmentDraft({ ...DRAFT, date: '2026-10-08', time: '08:00' }, now)).toBe(
      'past',
    );
    expect(validateAppointmentDraft({ ...DRAFT, hunterName: ' ' }, now)).toBe('hunter');
    expect(validateAppointmentDraft({ ...DRAFT, contactEmail: 'kein-at' }, now)).toBe('email');
  });
});

describe('toAppointment', () => {
  it('bereinigt Eingaben und setzt leere Felder auf null', () => {
    const appointment = toAppointment(
      { ...DRAFT, contactName: '  ', contactEmail: 'Einkauf@Beispiel.Example ' },
      { id: 'L-1', name: 'Metallbau Beispiel GmbH', location: 'Am Hafen 1, 26721 Emden' },
      '2026-10-13T08:00:00.000Z',
      'A-9',
      '2026-10-08T09:00:00.000Z',
    );
    expect(appointment).toMatchObject({
      id: 'A-9',
      contactName: null,
      contactEmail: 'einkauf@beispiel.example',
      hunterEmail: 'jonas.ahlers@cws.example',
      start: '2026-10-13T08:00:00.000Z',
    });
  });
});

describe('latestAppointmentByLead', () => {
  it('nimmt je Lead den zuletzt erfassten Termin', () => {
    const latest = latestAppointmentByLead([
      makeAppointment({ id: 'a', createdAt: '2026-10-08T09:00:00Z' }),
      makeAppointment({ id: 'b', createdAt: '2026-10-08T10:00:00Z' }),
    ]);
    expect(latest.get('L-1')?.id).toBe('b');
  });
});

describe('Bestätigung', () => {
  const slot = { date: '2026-10-13', time: '10:00' };

  it('formatiert den Termin mit Wochentag', () => {
    expect(formatSlot(slot)).toBe('Dienstag, 13.10.2026, 10:00 Uhr');
  });

  it('baut Betreff und Text mit Anrede, Ort und Hunter', () => {
    const mail = buildConfirmationMail(makeAppointment(), slot, 'Nele Faber');
    expect(mail.subject).toBe('Terminbestätigung CWS Workwear: Dienstag, 13.10.2026, 10:00 Uhr');
    expect(mail.body).toContain('Guten Tag Erika Beispiel,');
    expect(mail.body).toContain('Ort: Metallbau Beispiel GmbH, Am Hafen 1, 26721 Emden');
    expect(mail.body).toContain('Ihr Ansprechpartner bei CWS: Jonas Ahlers');
    expect(mail.body.endsWith('Nele Faber\nCWS Workwear')).toBe(true);
    expect(buildConfirmationMail(makeAppointment({ contactName: null }), slot, 'X').body).toMatch(
      /^Guten Tag,/,
    );
  });

  it('kodiert den mailto-Link mit Kopie an den Hunter', () => {
    const href = mailtoHref('kunde@beispiel.example', 'jonas.ahlers@cws.example', {
      subject: 'Termin & Ort',
      body: 'Zeile 1\nZeile 2',
    });
    expect(href).toBe(
      'mailto:kunde%40beispiel.example?subject=Termin%20%26%20Ort&cc=jonas.ahlers%40cws.example&body=Zeile%201%0D%0AZeile%202',
    );
    expect(mailtoHref(null, null, { subject: 'a', body: 'b' })).toBe('mailto:?subject=a&body=b');
  });
});

describe('buildIcs', () => {
  it('schreibt Beginn und Ende in UTC und maskiert Sonderzeichen', () => {
    const ics = buildIcs(
      makeAppointment({ leadName: 'Bau; Fehn, GmbH' }),
      '2026-10-08T09:00:00.000Z',
    );
    const lines = ics.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines).toContain('DTSTART:20261013T080000Z');
    expect(lines).toContain('DTEND:20261013T083000Z');
    expect(lines).toContain('DTSTAMP:20261008T090000Z');
    expect(lines).toContain('SUMMARY:CWS Workwear: Termin Bau\\; Fehn\\, GmbH');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(lines.every((line) => line.length <= 75)).toBe(true);
  });
});

describe('appointmentsToCsv', () => {
  it('schreibt Kopfzeile und Termin mit Semikolon und BOM', () => {
    const csv = appointmentsToCsv([makeAppointment()]);
    const lines = csv.slice(CSV_BOM.length).split('\r\n');
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(lines[0]).toBe(
      'Erfasst am;Lead-ID;Firma;Beginn;Dauer Minuten;Hunter;Hunter E-Mail;Ansprechpartner;E-Mail Ansprechpartner;Ort',
    );
    expect(lines[1]).toBe(
      '2026-10-08T09:00:00.000Z;L-1;Metallbau Beispiel GmbH;2026-10-13T08:00:00.000Z;30;Jonas Ahlers;jonas.ahlers@cws.example;Erika Beispiel;einkauf@beispiel.example;Am Hafen 1, 26721 Emden',
    );
  });
});

describe.each([
  ['Dexie', () => new DexieAppointmentRepository(new AppDatabase(`termine-${Math.random()}`))],
  ['InMemory', () => new InMemoryAppointmentRepository()],
])('%s-Terminablage', (_name, create) => {
  it('speichert, listet chronologisch und leert', async () => {
    const repo = create();
    await repo.add(makeAppointment({ id: 'b', createdAt: '2026-10-08T11:00:00Z' }));
    await repo.add(makeAppointment({ id: 'a', createdAt: '2026-10-08T09:00:00Z' }));
    expect((await repo.list()).map((a) => a.id)).toEqual(['a', 'b']);
    await repo.clear();
    expect(await repo.list()).toEqual([]);
  });
});
