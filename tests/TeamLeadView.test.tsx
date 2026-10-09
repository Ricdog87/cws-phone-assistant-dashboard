import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '@/app/store';
import { MockProvider } from '@/data/providers/mockProvider';
import { TeamLeadView } from '@/features/dashboard/TeamLeadView';

function sectionButton(name: RegExp): HTMLElement {
  return within(screen.getByRole('group', { name: 'Bereich' })).getByRole('button', { name });
}

describe('Dashboard Teamleitung', () => {
  beforeEach(async () => {
    await act(async () => {
      await useAppStore.getState().clearOutcomes();
      await useAppStore.getState().loadFromProvider(new MockProvider());
    });
    act(() => useAppStore.getState().signIn('teamLead'));
  });

  it('zeigt Termine heute und diese Woche, Anrufe und Wochenziel', () => {
    render(<TeamLeadView />);
    for (const label of ['Termine heute', 'Termine diese Woche', 'Anrufe heute', 'Im Wochenziel']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${label}`) })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: /^Termine heute/ })).toHaveTextContent('15');
    const sections = within(screen.getByRole('group', { name: 'Bereich' })).getAllByRole('button');
    expect(sections.map((button) => button.textContent?.split(' ')[0])).toEqual([
      'Team',
      'Hunter',
      'Termine',
    ]);
    // Team: eine Zeile je Person mit Hunter und Terminen heute
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(23);
    expect(within(table).getByRole('columnheader', { name: 'Hunter' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Termine heute' })).toBeInTheDocument();
  });

  it('öffnet beim Klick auf eine Person ihre Kennzahlen mit Werdegang', async () => {
    const user = userEvent.setup();
    render(<TeamLeadView />);
    await user.click(screen.getByRole('button', { name: /Pia Janssen/ }));
    const detail = screen.getByRole('region', { name: 'Pia Janssen' });
    expect(within(detail).getByText(/Werdegang/)).toBeInTheDocument();
    expect(within(detail).getByLabelText('Arbeitet für Hunter (Sales Rep)')).toHaveValue(
      'Birte Carstens',
    );
  });

  it('springt von der Kachel zu den heutigen Terminen', async () => {
    const user = userEvent.setup();
    render(<TeamLeadView />);
    await user.click(screen.getByRole('button', { name: /^Termine heute/ }));
    expect(sectionButton(/Termine/)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^Heute/ })).toHaveAttribute('aria-pressed', 'true');
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(15);
  });

  it('zeigt die Hunter mit Gebiet', async () => {
    const user = userEvent.setup();
    render(<TeamLeadView />);
    await user.click(sectionButton(/Hunter/));
    const hunters = screen.getByRole('table');
    expect(within(hunters).getAllByRole('row')).toHaveLength(7);
    expect(within(hunters).getByText('Oldenburg und Ostfriesland')).toBeInTheDocument();
  });
});
