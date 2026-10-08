import { describe, expect, it } from 'vitest';
import { teamStanding, type MemberActivity } from '@/domain/standings';
import { largestGaps, withRanks } from '@/features/dashboard/boardRows';
import { weekStatusLabel } from '@/features/dashboard/memberFormat';

function person(id: string, weekAppointments: number, dayCalls: number): MemberActivity {
  const [givenName = id, familyName = 'Test'] = id.split('-');
  return {
    id,
    givenName,
    familyName,
    dayCalls,
    dayAppointments: 0,
    weekCalls: dayCalls * 4,
    weekAppointments,
    live: false,
  };
}

const team = teamStanding(
  [
    person('anna-a', 4, 50),
    person('ben-b', 1, 30),
    person('cara-c', 1, 45),
    person('dora-d', 0, 10),
    person('emil-e', 3, 52),
  ],
  'nord',
  'Nord',
);

describe('withRanks', () => {
  it('übernimmt die Rangfolge aus den Standings', () => {
    expect(withRanks(team.members).map((row) => [row.rank, row.member.id])).toEqual([
      [1, 'anna-a'],
      [2, 'emil-e'],
      [3, 'cara-c'],
      [4, 'ben-b'],
      [5, 'dora-d'],
    ]);
  });
});

describe('largestGaps', () => {
  it('sortiert nach offenen Terminen, dann offenen Anrufen heute', () => {
    expect(largestGaps(team.members, 3).map((member) => member.id)).toEqual([
      'dora-d',
      'ben-b',
      'cara-c',
    ]);
  });

  it('lässt Personen im Wochenziel weg', () => {
    expect(largestGaps(team.members, 10).map((member) => member.id)).not.toContain('anna-a');
  });
});

describe('weekStatusLabel', () => {
  it('nutzt Einzahl und Mehrzahl', () => {
    expect(weekStatusLabel(0)).toBe('Im Wochenziel');
    expect(weekStatusLabel(1)).toBe('1 Termin offen');
    expect(weekStatusLabel(3)).toBe('3 Termine offen');
  });
});
