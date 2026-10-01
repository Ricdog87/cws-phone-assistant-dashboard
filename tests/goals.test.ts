import { describe, expect, it } from 'vitest';
import { DAILY_CALL_GOAL, WEEKLY_APPOINTMENT_GOAL, callDay, goalProgress } from '@/domain/goals';
import { makeOutcome } from './fixtures';

function localIso(year: number, month: number, day: number, hour = 12, minute = 0): string {
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

describe('callDay', () => {
  it('nennt Donnerstag und vier Tage bis Sonntag', () => {
    expect(callDay(new Date(2026, 9, 1, 9, 15, 0, 0))).toEqual({
      weekday: 'Donnerstag',
      dateLabel: '01.10.2026',
      daysRemaining: 4,
      weekEndLabel: '04.10.2026',
    });
  });

  it('zählt den Sonntag als letzten Tag', () => {
    expect(callDay(new Date(2026, 9, 4, 20, 0, 0, 0))).toEqual({
      weekday: 'Sonntag',
      dateLabel: '04.10.2026',
      daysRemaining: 1,
      weekEndLabel: '04.10.2026',
    });
  });

  it('gibt der Woche am Montag sieben Tage', () => {
    expect(callDay(new Date(2026, 8, 28, 8, 0, 0, 0)).daysRemaining).toBe(7);
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

  it('zählt den Sonntag zur laufenden Woche', () => {
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
