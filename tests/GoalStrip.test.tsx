import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GoalStrip } from '@/components/GoalStrip';
import { callDay } from '@/domain/goals';

function renderFor(now: Date, weekAppointments = 1) {
  render(
    <GoalStrip
      dayCalls={12}
      dayAppointments={1}
      weekCalls={40}
      weekAppointments={weekAppointments}
      dailyCallGoal={50}
      weeklyGoal={4}
      {...callDay(now)}
    />,
  );
}

describe('GoalStrip', () => {
  it('zählt die Arbeitstage bis Freitag', () => {
    renderFor(new Date(2026, 9, 12, 9, 0));
    expect(
      screen.getByText(
        'Heute ist Montag, der 12.10.2026. Noch 5 Arbeitstage bis Freitag, 16.10.2026.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Noch 3 Termine bis zum Wochenziel.')).toBeInTheDocument();
    expect(screen.queryByText(/Sonntag/)).not.toBeInTheDocument();
  });

  it('nennt den Freitag als letzten Arbeitstag', () => {
    renderFor(new Date(2026, 9, 16, 9, 0));
    expect(screen.getByText(/Letzter Arbeitstag für das Wochenziel/)).toBeInTheDocument();
  });

  it('schließt die Woche am Wochenende ab und setzt kein Tagesziel', () => {
    renderFor(new Date(2026, 9, 17, 11, 0), 3);
    expect(
      screen.getByText(
        'Heute ist Samstag, der 17.10.2026. Wochenende, die nächste Vertriebswoche beginnt am Montag, 19.10.2026.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Woche abgeschlossen mit 3 von 4 Terminen.')).toBeInTheDocument();
    expect(screen.getByText('Wochenende, kein Tagesziel')).toBeInTheDocument();
  });
});
