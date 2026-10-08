import { describe, expect, it } from 'vitest';
import { bookedOn, liveTeamAppointments, sortTeamAppointments } from '@/domain/appointments';

describe('Terminübersicht', () => {
  const booked = [
    {
      id: 'o1',
      leadId: 'L-1',
      leadName: 'Metallbau Beispiel GmbH',
      owner: 'Jonas Tiedemann',
      recordedAt: '2026-10-08T07:00:00Z',
    },
    {
      id: 'o2',
      leadId: 'L-2',
      leadName: 'Bau Beispiel KG',
      owner: null,
      recordedAt: '2026-10-08T09:00:00Z',
    },
  ];

  it('zeigt gebuchte Termine mit dem Status ihres Anrufprotokolls, neueste zuerst', () => {
    const rows = sortTeamAppointments(
      liveTeamAppointments(booked, new Map([['o1', 'synced' as const]]), 'Nele Faber'),
    );
    expect(rows.map((row) => [row.id, row.status, row.hunterName])).toEqual([
      ['o2', 'pending', 'nicht zugeordnet'],
      ['o1', 'synced', 'Jonas Tiedemann'],
    ]);
    expect(rows.every((row) => row.live && row.assistantName === 'Nele Faber')).toBe(true);
  });

  it('erkennt Termine des Tages in Ortszeit', () => {
    const local = new Date(2026, 9, 8, 10, 30).toISOString();
    expect(bookedOn({ bookedAt: local }, '2026-10-08')).toBe(true);
    expect(bookedOn({ bookedAt: local }, '2026-10-07')).toBe(false);
  });
});
