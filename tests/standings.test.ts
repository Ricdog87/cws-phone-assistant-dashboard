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

  it('verdichtet 15 Personen auf die bestehenden Ziele', () => {
    expect(team.headcount).toBe(15);
    expect(team.dayCalls).toBe(575);
    expect(team.weekCalls).toBe(2298);
    expect(team.weekAppointments).toBe(33);
    expect(team.dailyCallGoal).toBe(750);
    expect(team.weeklyAppointmentGoal).toBe(60);
    expect(team.atWeeklyGoal).toBe(4);
    expect(team.underDailyGoal).toBe(11);
    expect(team.appointmentsPer100).toBeCloseTo((33 / 2298) * 100);
    expect(team.members[0]?.fullName).toBe('Pia Janssen');
  });

  it('ersetzt nur die Live-Zeile und lässt die anderen stehen', () => {
    const replaced = applyLiveActivity(DEMO_MEMBERS, {
      id: LIVE_ASSISTANT_ID,
      dayCalls: 2,
      weekCalls: 2,
      weekAppointments: 1,
    });
    const live = replaced.find((member) => member.id === LIVE_ASSISTANT_ID);
    expect(live).toMatchObject({ dayCalls: 2, weekCalls: 2, weekAppointments: 1, live: true });
    expect(replaced.find((member) => member.id === 'pia-janssen')?.dayCalls).toBe(55);

    const next = teamStanding(replaced, DEMO_TEAM_ID, DEMO_TEAM_NAME);
    expect(next.dayCalls).toBe(577);
    expect(next.weekAppointments).toBe(34);
    expect(next.atWeeklyGoal).toBe(4);
  });

  it('lässt unbekannte Live-Zeilen unverändert', () => {
    const same = applyLiveActivity(DEMO_MEMBERS, {
      id: 'unbekannt',
      dayCalls: 9,
      weekCalls: 9,
      weekAppointments: 9,
    });
    expect(same).toEqual(DEMO_MEMBERS);
  });

  it('liefert null ohne Personen', () => {
    expect(teamStanding([], 'leer', 'Leer')).toMatchObject({
      headcount: 0,
      dayCalls: 0,
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
  it('teilt das Vertriebsgebiet Nordwest in zwei Regionen mit je 15 Personen', () => {
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
    expect(teams[1]).toMatchObject({
      headcount: 15,
      dayCalls: 604,
      weekCalls: 2315,
      weekAppointments: 33,
      atWeeklyGoal: 3,
      underDailyGoal: 11,
    });
    const director = directorStanding(teams);
    expect(director.teamCount).toBe(2);
    expect(director.headcount).toBe(30);
    expect(director.dayCalls).toBe(1179);
    expect(director.weekAppointments).toBe(66);
    expect(director.dailyCallGoal).toBe(1500);
    expect(director.weeklyAppointmentGoal).toBe(120);
    expect(director.atWeeklyGoal).toBe(7);
    expect(director.underDailyGoal).toBe(22);
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
    expect(director.headcount).toBe(16);
    expect(director.dayCalls).toBe(585);
    expect(director.weekAppointments).toBe(34);
    expect(director.dailyCallGoal).toBe(800);
    expect(director.weeklyAppointmentGoal).toBe(64);
    expect(director.atWeeklyGoal).toBe(4);
  });
});
