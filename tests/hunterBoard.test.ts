import { describe, expect, it } from 'vitest';
import { demoHunterAssignments } from '@/data/demoAssignments';
import { DEMO_REGIONS } from '@/data/demoTeam';
import { hunterRows } from '@/domain/hunterBoard';
import { DEFAULT_WEIGHTS, scoreLeads } from '@/domain/scoring';
import { makeLead, makeOutcome } from './fixtures';

const NOW = new Date('2026-10-08T12:00:00');

describe('hunterRows', () => {
  const scored = scoreLeads(
    [
      makeLead({ id: 'a', owner: 'Anna', wearerCount: 220, hasDirectDial: true, contactName: 'X' }),
      makeLead({ id: 'b', owner: 'Anna', lastActivity: '2026-10-01' }),
      makeLead({ id: 'c', owner: 'Ben' }),
      makeLead({ id: 'd', owner: 'Anna', isCustomer: true }),
    ],
    DEFAULT_WEIGHTS,
  );

  it('zählt Bestand, Qualität und Wochenstand je Hunter', () => {
    const rows = hunterRows(
      [
        { hunter: 'Anna', assistants: ['P1'], baselineWeekCalls: 10, baselineWeekAppointments: 1 },
        { hunter: 'Ben', assistants: [], baselineWeekCalls: 0, baselineWeekAppointments: 0 },
      ],
      scored,
      [
        makeOutcome({
          id: '1',
          owner: 'Anna',
          outcome: 'appointment',
          recordedAt: '2026-10-07T09:00:00',
        }),
        makeOutcome({
          id: '2',
          owner: 'Anna',
          outcome: 'not_reached',
          recordedAt: '2026-10-08T09:00:00',
        }),
        // Vorwoche zählt nicht
        makeOutcome({
          id: '3',
          owner: 'Anna',
          outcome: 'appointment',
          recordedAt: '2026-10-02T09:00:00',
        }),
      ],
      NOW,
    );
    expect(rows.map((row) => row.hunter)).toEqual(['Ben', 'Anna']);
    const anna = rows.find((row) => row.hunter === 'Anna');
    expect(anna).toMatchObject({
      accounts: 2,
      aAccounts: 1,
      neverContacted: 1,
      inCooldown: 1,
      weekCalls: 12,
      weekAppointments: 2,
    });
    expect(anna?.appointmentsPer100).toBeCloseTo((2 / 12) * 100, 10);
  });
});

describe('demoHunterAssignments', () => {
  it('verteilt die Wochenwerte der Region ohne Doppelzählung auf ihre Hunter', () => {
    for (const region of DEMO_REGIONS) {
      const assignments = demoHunterAssignments(region.id, region.members, {});
      const nonLive = region.members.filter((member) => member.id !== 'nele-faber');
      const sum = (key: 'weekCalls' | 'weekAppointments') =>
        nonLive.reduce((total, member) => total + member[key], 0);
      expect(assignments).toHaveLength(2);
      expect(assignments.reduce((t, a) => t + a.baselineWeekCalls, 0)).toBe(sum('weekCalls'));
      expect(assignments.reduce((t, a) => t + a.baselineWeekAppointments, 0)).toBe(
        sum('weekAppointments'),
      );
      const people = assignments.flatMap((a) => a.assistants);
      expect(new Set(people).size).toBe(region.members.length);
    }
  });
});

describe('Zuordnung per Auswahl', () => {
  it('folgt der geänderten Zuordnung und verschiebt die Wochenwerte mit', () => {
    const region = DEMO_REGIONS[0];
    if (!region) throw new Error('Region fehlt');
    const jana = region.members.find((member) => member.id === 'jana-osterkamp');
    if (!jana) throw new Error('Person fehlt');
    const before = demoHunterAssignments(region.id, region.members, {});
    const target = before.find((row) => !row.assistants.includes('Jana Osterkamp'));
    if (!target) throw new Error('Hunter fehlt');
    const after = demoHunterAssignments(region.id, region.members, {
      'jana-osterkamp': target.hunter,
    });
    const moved = after.find((row) => row.hunter === target.hunter);
    expect(moved?.assistants).toContain('Jana Osterkamp');
    expect(moved?.baselineWeekCalls).toBe(target.baselineWeekCalls + jana.weekCalls);
  });
});
