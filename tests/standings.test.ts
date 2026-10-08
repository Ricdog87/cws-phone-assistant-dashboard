import { describe, expect, it } from 'vitest';
import {
  DEMO_MEMBERS,
  DEMO_REGIONS,
  DEMO_TEAM_ID,
  DEMO_TEAM_NAME,
  LIVE_ASSISTANT_ID,
} from '@/data/demoTeam';
import { applyLiveActivity, directorStanding, teamStanding } from '@/domain/standings';

describe('teamStanding', () => {
  const team = teamStanding(DEMO_MEMBERS, DEMO_TEAM_ID, DEMO_TEAM_NAME);

  it('verdichtet 22 Personen auf die bestehenden Ziele', () => {
    expect(team.headcount).toBe(22);
    expect(team.dayCalls).toBe(878);
    expect(team.weekCalls).toBe(3493);
    expect(team.weekAppointments).toBe(51);
    expect(team.dayAppointments).toBe(15);
    expect(team.dailyCallGoal).toBe(1100);
    expect(team.weeklyAppointmentGoal).toBe(88);
    expect(team.atWeeklyGoal).toBe(5);
    expect(team.underDailyGoal).toBe(16);
    expect(team.appointmentsPer100).toBeCloseTo((51 / 3493) * 100);
    expect(team.members[0]?.fullName).toBe('Pia Janssen');
  });

  it('ersetzt nur die Live-Zeile und lässt die anderen stehen', () => {
    const replaced = applyLiveActivity(DEMO_MEMBERS, {
      id: LIVE_ASSISTANT_ID,
      dayCalls: 2,
      dayAppointments: 1,
      weekCalls: 2,
      weekAppointments: 1,
    });
    const live = replaced.find((member) => member.id === LIVE_ASSISTANT_ID);
    expect(live).toMatchObject({ dayCalls: 2, weekCalls: 2, weekAppointments: 1, live: true });
    expect(replaced.find((member) => member.id === 'pia-janssen')?.dayCalls).toBe(55);

    const next = teamStanding(replaced, DEMO_TEAM_ID, DEMO_TEAM_NAME);
    expect(next.dayCalls).toBe(880);
    expect(next.weekAppointments).toBe(52);
    expect(next.dayAppointments).toBe(16);
    expect(next.atWeeklyGoal).toBe(5);
  });

  it('lässt unbekannte Live-Zeilen unverändert', () => {
    const same = applyLiveActivity(DEMO_MEMBERS, {
      id: 'unbekannt',
      dayCalls: 9,
      dayAppointments: 9,
      weekCalls: 9,
      weekAppointments: 9,
    });
    expect(same).toEqual(DEMO_MEMBERS);
  });

  it('liefert null ohne Personen', () => {
    expect(teamStanding([], 'leer', 'Leer')).toMatchObject({
      headcount: 0,
      dayCalls: 0,
      dayAppointments: 0,
      weekCalls: 0,
      weekAppointments: 0,
      dailyCallGoal: 0,
      weeklyAppointmentGoal: 0,
      appointmentsPer100: 0,
      atWeeklyGoal: 0,
      underDailyGoal: 0,
    });
  });
});

describe('DEMO_REGIONS', () => {
  it('teilt das Vertriebsgebiet Nordwest in Nord mit 22 und NRW mit 18 Personen', () => {
    expect(DEMO_REGIONS.map((region) => region.name)).toEqual(['Nord', 'NRW']);
    expect(DEMO_REGIONS.map((region) => region.states)).toEqual([
      'Niedersachsen, Bremen, Hamburg, Schleswig-Holstein',
      'Nordrhein-Westfalen',
    ]);
    expect(
      DEMO_REGIONS.map((region) => `${region.leadGivenName} ${region.leadFamilyName}`),
    ).toEqual(['Martina Weidmann', 'Julia Sander']);
    const teams = DEMO_REGIONS.map((region) =>
      teamStanding(region.members, region.id, region.name),
    );
    expect(teams[0]?.headcount).toBe(22);
    expect(teams[1]).toMatchObject({
      headcount: 18,
      dayCalls: 739,
      weekCalls: 2843,
      weekAppointments: 41,
      dayAppointments: 12,
      atWeeklyGoal: 4,
      underDailyGoal: 13,
    });
    const director = directorStanding(teams);
    expect(director.teamCount).toBe(2);
    expect(director.headcount).toBe(40);
    expect(director.dayCalls).toBe(1617);
    expect(director.weekAppointments).toBe(92);
    expect(director.dayAppointments).toBe(27);
    expect(director.dailyCallGoal).toBe(2000);
    expect(director.weeklyAppointmentGoal).toBe(160);
    expect(director.atWeeklyGoal).toBe(9);
    expect(director.underDailyGoal).toBe(29);
  });
});

describe('directorStanding', () => {
  it('summiert Teams, ohne die Teamzeilen aufzulösen', () => {
    const nordwest = teamStanding(DEMO_MEMBERS, DEMO_TEAM_ID, DEMO_TEAM_NAME);
    const second = teamStanding(
      [
        {
          id: 'a',
          givenName: 'Ann',
          familyName: 'Berg',
          dayCalls: 10,
          dayAppointments: 1,
          weekCalls: 40,
          weekAppointments: 1,
          live: false,
        },
      ],
      'sued',
      'Süd',
    );
    const director = directorStanding([nordwest, second]);
    expect(director.teamCount).toBe(2);
    expect(director.teams.map((team) => team.teamName)).toEqual(['Nord', 'Süd']);
    expect(director.headcount).toBe(23);
    expect(director.dayCalls).toBe(888);
    expect(director.weekAppointments).toBe(52);
    expect(director.dailyCallGoal).toBe(1150);
    expect(director.weeklyAppointmentGoal).toBe(92);
    expect(director.atWeeklyGoal).toBe(5);
  });
});
