import { describe, expect, it } from 'vitest';
import {
  DexieAppointmentRepository,
  InMemoryAppointmentRepository,
} from '@/data/appointmentRepository';
import { AppDatabase } from '@/data/db';
import {
  eventDescription,
  eventSubject,
  latestAppointmentByLead,
  liveTeamAppointments,
  sortTeamAppointments,
} from '@/domain/appointments';
import type { Appointment } from '@/domain/types';

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'A-1',
    leadId: 'L-1',
    leadName: 'Metallbau Beispiel GmbH',
    hunterName: 'Jonas Tiedemann',
    createdAt: '2026-10-08T09:00:00.000Z',
    salesforceOpenedAt: null,
    ...overrides,
  };
}

describe('Termin in Salesforce', () => {
  it('baut Betreff und Beschreibung ohne leere Zeilen', () => {
    expect(eventSubject('Metallbau Beispiel GmbH')).toBe(
      'Neukundentermin: Metallbau Beispiel GmbH',
    );
    expect(
      eventDescription({
        assistantName: 'Nele Faber',
        hunterName: 'Jonas Tiedemann',
        contactName: null,
      }),
    ).toBe('Vereinbart von Nele Faber über das Lead-Cockpit.\nHunter: Jonas Tiedemann');
  });
});

describe('latestAppointmentByLead', () => {
  it('nimmt je Lead den zuletzt erfassten Eintrag', () => {
    const latest = latestAppointmentByLead([
      makeAppointment({ id: 'a', createdAt: '2026-10-08T09:00:00Z' }),
      makeAppointment({ id: 'b', createdAt: '2026-10-08T10:00:00Z' }),
    ]);
    expect(latest.get('L-1')?.id).toBe('b');
  });
});

describe('Terminübersicht', () => {
  it('zeigt gebuchte Termine mit Status in Salesforce, offene zuerst', () => {
    const rows = sortTeamAppointments(
      liveTeamAppointments(
        [makeAppointment({ leadId: 'L-1', salesforceOpenedAt: '2026-10-08T09:05:00Z' })],
        [
          {
            id: 'o1',
            leadId: 'L-1',
            leadName: 'Metallbau Beispiel GmbH',
            owner: 'Jonas Tiedemann',
            recordedAt: '2026-10-08T09:00:00Z',
          },
          {
            id: 'o2',
            leadId: 'L-2',
            leadName: 'Bau Beispiel KG',
            owner: null,
            recordedAt: '2026-10-08T08:00:00Z',
          },
        ],
        'Nele Faber',
      ),
    );
    expect(rows.map((row) => [row.id, row.status])).toEqual([
      ['o2', 'open'],
      ['o1', 'entered'],
    ]);
    expect(rows[0]).toMatchObject({ hunterName: 'nicht zugeordnet', live: true });
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
