import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '@/app/store';
import { MockProvider } from '@/data/providers/mockProvider';
import { TeamLeadView } from '@/features/dashboard/TeamLeadView';

describe('Dashboard Teamleitung', () => {
  beforeEach(async () => {
    await act(async () => {
      await useAppStore.getState().clearOutcomes();
      await useAppStore.getState().loadFromProvider(new MockProvider());
    });
    act(() => useAppStore.getState().signIn('teamLead'));
  });

  it('zeigt vier Kennzahlen und einen Bereich mit Team, Hunter und Terminen', () => {
    render(<TeamLeadView />);
    for (const label of [
      'Termine diese Woche',
      'Anrufe heute',
      'Im Wochenziel',
      'Noch nicht in Salesforce',
    ]) {
      expect(screen.getByRole('button', { name: new RegExp(`^${label}`) })).toBeInTheDocument();
    }
    const sections = within(screen.getByRole('group', { name: 'Bereich' })).getAllByRole('button');
    expect(sections.map((button) => button.textContent?.split(' ')[0])).toEqual([
      'Team',
      'Hunter',
      'Termine',
    ]);
    expect(sections[0]).toHaveAttribute('aria-pressed', 'true');
    // Team: eine Zeile je Person mit Hunter
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(23);
    expect(within(table).getByRole('columnheader', { name: 'Hunter' })).toBeInTheDocument();
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

  it('zeigt die Hunter mit Gebiet und springt von der Kachel zu offenen Terminen', async () => {
    const user = userEvent.setup();
    render(<TeamLeadView />);
    const group = screen.getByRole('group', { name: 'Bereich' });
    await user.click(within(group).getByRole('button', { name: /Hunter/ }));
    const hunters = screen.getByRole('table');
    expect(within(hunters).getAllByRole('row')).toHaveLength(7);
    expect(within(hunters).getByText('Oldenburg und Ostfriesland')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Noch nicht in Salesforce/ }));
    expect(within(group).getByRole('button', { name: /Termine/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row).toHaveTextContent('Noch nicht in Salesforce');
  });
});
