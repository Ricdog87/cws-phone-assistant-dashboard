import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '@/app/store';
import { MockProvider } from '@/data/providers/mockProvider';
import { QueueView } from '@/features/queue/QueueView';

/** Einträge der Warteschlange, ohne die Optionen der Tourauswahl */
function queueOptions(): HTMLElement[] {
  return within(screen.getByRole('listbox', { name: 'Warteschlange' })).getAllByRole('option');
}

function selectedName(): string {
  const option = queueOptions().find((o) => o.getAttribute('aria-selected') === 'true');
  return option?.querySelector('span.text-sm.font-bold')?.textContent ?? '';
}

describe('QueueView', () => {
  beforeEach(async () => {
    await act(async () => {
      await useAppStore.getState().clearOutcomes();
      await useAppStore.getState().loadFromProvider(new MockProvider());
    });
  });

  it('wählt den ersten Lead und wechselt mit den Pfeiltasten', async () => {
    const user = userEvent.setup();
    render(<QueueView />);
    const options = queueOptions();
    expect(options.length).toBeGreaterThan(10);
    const first = selectedName();
    expect(first).not.toBe('');

    await user.keyboard('{ArrowDown}');
    const second = selectedName();
    expect(second).not.toBe(first);

    await user.keyboard('{ArrowUp}');
    expect(selectedName()).toBe(first);
  });

  it('bucht mit Taste 1 einen Termin und springt zum nächsten offenen Lead', async () => {
    const user = userEvent.setup();
    render(<QueueView />);
    const first = selectedName();

    await user.keyboard('1');

    const outcomes = useAppStore.getState().outcomes;
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toMatchObject({
      leadName: first,
      outcome: 'appointment',
      queuePosition: 1,
    });
    expect(selectedName()).not.toBe(first);

    const booked = queueOptions()[0];
    expect(booked).toHaveClass('opacity-50');
    expect(within(booked as HTMLElement).getByText(/Termin vereinbart/)).toBeInTheDocument();

    // Live-Maske: dieselbe Persona und dieselben Ziele wie in Teamleitung und Vertriebsleitung
    const live = screen.getByRole('region', { name: 'Live-Maske Telefonassistenz' });
    expect(live).toHaveTextContent('Hallo Nele Faber');
    expect(live).toHaveTextContent('1 / 50');
    expect(live).toHaveTextContent('1 / 4');
    expect(live).toHaveTextContent('noch 3');
  });

  it('bucht über die Schaltfläche', async () => {
    const user = userEvent.setup();
    render(<QueueView />);
    await user.click(screen.getByRole('button', { name: /Kein Interesse/ }));
    expect(useAppStore.getState().outcomes[0]?.outcome).toBe('not_interested');
  });
});
