import { describe, expect, it } from 'vitest';
import {
  computeAgentDayProgress,
  greeting,
  localDayKeyFromDate,
  motivationLine,
  startOfLocalWeek,
  type AgentGoals,
} from '@/domain/agentGoals';
import type { CallOutcome } from '@/domain/types';

const GOALS: AgentGoals = { dailyCalls: 75, weeklyAppointments: 4 };

function outcome(
  partial: Pick<CallOutcome, 'outcome' | 'recordedAt'> & { id?: string },
): CallOutcome {
  return {
    id: partial.id ?? 'o1',
    leadId: 'l1',
    leadName: 'Demo',
    outcome: partial.outcome,
    recordedAt: partial.recordedAt,
    band: 'A',
    score: 80,
    dimensions: { fit: 80, potential: 80, reachability: 80 },
    normalizedWeights: { fit: 42.9, potential: 35.7, reachability: 21.4 },
    isControl: false,
    queuePosition: 1,
    sourceId: 'mock',
  };
}

describe('greeting', () => {
  it('begrüßt mit Namen', () => {
    expect(greeting('Tina Muster')).toBe('Hallo Tina Muster');
  });
});

describe('startOfLocalWeek', () => {
  it('setzt den Wochenstart auf Montag', () => {
    // Mittwoch 7. Oktober 2026 lokal
    const wednesday = new Date(2026, 9, 7, 15, 0, 0);
    const monday = startOfLocalWeek(wednesday);
    expect(localDayKeyFromDate(monday)).toBe('2026-10-05');
    expect(monday.getHours()).toBe(0);
  });
});

describe('computeAgentDayProgress', () => {
  it('zählt Anrufe heute und Termine in der Woche', () => {
    const now = new Date(2026, 9, 5, 12, 0, 0); // Montag
    const outcomes = [
      outcome({
        id: '1',
        outcome: 'callback',
        recordedAt: new Date(2026, 9, 5, 9, 0).toISOString(),
      }),
      outcome({
        id: '2',
        outcome: 'appointment',
        recordedAt: new Date(2026, 9, 5, 10, 0).toISOString(),
      }),
      outcome({
        id: '3',
        outcome: 'appointment',
        recordedAt: new Date(2026, 9, 6, 11, 0).toISOString(),
      }),
      outcome({
        id: '4',
        outcome: 'not_reached',
        recordedAt: new Date(2026, 9, 4, 11, 0).toISOString(),
      }),
    ];

    const progress = computeAgentDayProgress(outcomes, GOALS, now);
    expect(progress.callsToday.current).toBe(2);
    expect(progress.callsToday.target).toBe(75);
    expect(progress.callsToday.remaining).toBe(73);
    expect(progress.appointmentsThisWeek.current).toBe(2);
    expect(progress.appointmentsThisWeek.remaining).toBe(2);
  });
});

describe('motivationLine', () => {
  it('motiviert am Tagesbeginn', () => {
    const line = motivationLine({
      callsToday: {
        current: 0,
        target: 75,
        percent: 0,
        remaining: 75,
        reached: false,
      },
      appointmentsThisWeek: {
        current: 0,
        target: 4,
        percent: 0,
        remaining: 4,
        reached: false,
      },
    });
    expect(line).toContain('75 Anrufe');
    expect(line).toContain('4 Termine');
  });

  it('bestätigt erreichte Ziele', () => {
    const line = motivationLine({
      callsToday: {
        current: 75,
        target: 75,
        percent: 100,
        remaining: 0,
        reached: true,
      },
      appointmentsThisWeek: {
        current: 4,
        target: 4,
        percent: 100,
        remaining: 0,
        reached: true,
      },
    });
    expect(line).toContain('erreicht');
  });
});
