import { describe, expect, it } from 'vitest';
import { DAILY_CALL_GOAL, WEEKLY_APPOINTMENT_GOAL, callDay, goalProgress } from '@/domain/goals';
import { makeOutcome } from './fixtures';

function localIso(year: number, month: number, day: number, hour = 12, minute = 0): string {
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

describe('callDay', () => {
  it('rechnet die Vertriebswoche von Montag bis Freitag', () => {
    expect(callDay(new Date(2026, 9, 12, 9, 0, 0, 0))).toEqual({
      weekday: 'Montag',
      dateLabel: '12.10.2026',
      workday: true,
      daysRemaining: 5,
      weekEndLabel: '16.10.2026',
      nextWeekStartLabel: '19.10.2026',
    });
  });

  it('nennt am Donnerstag zwei Arbeitstage bis Freitag', () => {
    const day = callDay(new Date(2026, 9, 1, 9, 15, 0, 0));
    expect(day.weekday).toBe('Donnerstag');
    expect(day.daysRemaining).toBe(2);
    expect(day.weekEndLabel).toBe('02.10.2026');
  });

  it('zählt den Freitag als letzten Arbeitstag', () => {
    const day = callDay(new Date(2026, 9, 16, 17, 0, 0, 0));
    expect(day.workday).toBe(true);
    expect(day.daysRemaining).toBe(1);
    expect(day.weekEndLabel).toBe('16.10.2026');
  });

  it('kennt am Wochenende keine Arbeitstage und nennt den nächsten Montag', () => {
    for (const weekend of [new Date(2026, 9, 17, 10), new Date(2026, 9, 18, 20)]) {
      expect(callDay(weekend)).toMatchObject({
        workday: false,
        daysRemaining: 0,
        weekEndLabel: '16.10.2026',
        nextWeekStartLabel: '19.10.2026',
      });
    }
  });
});

describe('goalProgress', () => {
  const thursday = new Date(2026, 9, 1, 9, 15, 0, 0);

  const outcomes = [
    makeOutcome({ id: 'prev', recordedAt: localIso(2026, 9, 27, 23, 0), outcome: 'appointment' }),
    makeOutcome({ id: 'mon', recordedAt: localIso(2026, 9, 28, 0, 0), outcome: 'callback' }),
    makeOutcome({
      id: 'today-apt',
      recordedAt: localIso(2026, 10, 1, 8, 0),
      outcome: 'appointment',
    }),
    makeOutcome({
      id: 'today-miss',
      recordedAt: localIso(2026, 10, 1, 8, 30),
      outcome: 'not_reached',
    }),
    makeOutcome({ id: 'fri', recordedAt: localIso(2026, 10, 2, 10, 0), outcome: 'appointment' }),
    makeOutcome({ id: 'next', recordedAt: localIso(2026, 10, 5, 0, 0), outcome: 'appointment' }),
    makeOutcome({ id: 'bad', recordedAt: 'kein-datum', outcome: 'appointment' }),
  ];

  it('trennt heute und die laufende Woche ab Montag', () => {
    const progress = goalProgress(outcomes, thursday);
    expect(WEEKLY_APPOINTMENT_GOAL).toBe(4);
    expect(DAILY_CALL_GOAL).toBe(50);
    expect(progress.day).toEqual({ calls: 2, appointments: 1 });
    expect(progress.week).toEqual({ calls: 4, appointments: 2 });
    expect(progress.weeklyAppointmentGoal).toBe(4);
    expect(progress.dailyCallGoal).toBe(50);
    expect(progress.appointmentsRemaining).toBe(2);
    expect(progress.callsRemaining).toBe(48);
  });

  it('zählt Ergebnisse vom Wochenende zur Vertriebswoche davor', () => {
    const sunday = new Date(2026, 9, 4, 20, 0, 0, 0);
    const progress = goalProgress(
      [
        makeOutcome({
          id: 'sun',
          recordedAt: localIso(2026, 10, 4, 10, 0),
          outcome: 'not_interested',
        }),
        makeOutcome({ id: 'mon', recordedAt: localIso(2026, 9, 28, 9, 0), outcome: 'appointment' }),
      ],
      sunday,
    );
    expect(progress.day).toEqual({ calls: 1, appointments: 0 });
    expect(progress.week).toEqual({ calls: 2, appointments: 1 });
  });

  it('begrenzt den Rest auf 0, sobald das Wochenziel erreicht ist', () => {
    const booked = Array.from({ length: 5 }, (_, index) =>
      makeOutcome({
        id: `a-${index}`,
        recordedAt: localIso(2026, 10, 1, 8, index),
        outcome: 'appointment',
      }),
    );
    const progress = goalProgress(booked, thursday);
    expect(progress.week.appointments).toBe(5);
    expect(progress.appointmentsRemaining).toBe(0);
    expect(progress.callsRemaining).toBe(45);
  });

  it('liefert null ohne Ergebnisse', () => {
    expect(goalProgress([], thursday)).toEqual({
      day: { calls: 0, appointments: 0 },
      week: { calls: 0, appointments: 0 },
      weeklyAppointmentGoal: 4,
      dailyCallGoal: 50,
      appointmentsRemaining: 4,
      callsRemaining: 50,
    });
  });
});
