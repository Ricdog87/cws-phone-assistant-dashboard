import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '@/app/store';
import { MockProvider } from '@/data/providers/mockProvider';
import { nextBusinessDay } from '@/domain/recall';
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

  it('erinnert daran, einen gebuchten Termin in Salesforce einzutragen', async () => {
    const user = userEvent.setup();
    render(<QueueView />);
    const first = selectedName();

    await user.keyboard('1');
    expect(screen.getByRole('status')).toHaveTextContent(`Termin mit ${first} gebucht`);

    await user.click(screen.getByRole('button', { name: 'Jetzt eintragen' }));
    expect(selectedName()).toBe(first);
    expect(
      screen.getByRole('region', { name: 'Termin in Salesforce eintragen' }),
    ).toBeInTheDocument();
  });

  it('bucht über die Schaltfläche', async () => {
    const user = userEvent.setup();
    render(<QueueView />);
    await user.click(screen.getByRole('button', { name: /Kein Interesse/ }));
    expect(useAppStore.getState().outcomes[0]?.outcome).toBe('not_interested');
  });

  it('zeigt die Ergebnisleiste mit Termin und Wiedervorlage immer an', () => {
    render(<QueueView />);
    const bar = screen.getByRole('region', { name: 'Ergebnis erfassen' });
    expect(within(bar).getByRole('button', { name: /Termin vereinbart/ })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: /Wiedervorlage/ })).toBeInTheDocument();
  });

  it('plant mit Taste 2 eine Wiedervorlage mit Datum, Uhrzeit und Notiz', async () => {
    const user = userEvent.setup();
    render(<QueueView />);
    const first = selectedName();

    await user.keyboard('2');
    const form = screen.getByRole('form', { name: 'Wiedervorlage planen' });
    // Noch nichts gebucht, erst nach dem Speichern
    expect(useAppStore.getState().outcomes).toHaveLength(0);
    expect(within(form).getByLabelText('Datum')).toHaveValue(nextBusinessDay(new Date()));

    await user.type(within(form).getByLabelText('Uhrzeit (optional)'), '14:00');
    await user.type(within(form).getByLabelText('Notiz (optional)'), 'Einkauf entscheidet mit');
    await user.click(within(form).getByRole('button', { name: 'Wiedervorlage speichern' }));
    await waitFor(() => expect(useAppStore.getState().recalls).toHaveLength(1));

    const { outcomes, recalls } = useAppStore.getState();
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toMatchObject({
      leadName: first,
      outcome: 'callback',
      recallReason: 'callback',
    });
    expect(recalls).toHaveLength(1);
    expect(recalls[0]).toMatchObject({
      leadName: first,
      reason: 'callback',
      dueDate: nextBusinessDay(new Date()),
      dueTime: '14:00',
      note: 'Einkauf entscheidet mit',
      createdAt: outcomes[0]?.recordedAt,
      salesforceOpenedAt: null,
    });
    expect(screen.queryByRole('form', { name: 'Wiedervorlage planen' })).toBeNull();
    expect(selectedName()).not.toBe(first);
  });

  it('bricht die Wiedervorlage mit Escape ab, ohne zu buchen', async () => {
    const user = userEvent.setup();
    render(<QueueView />);
    await user.click(screen.getByRole('button', { name: /Wiedervorlage/ }));
    expect(screen.getByRole('form', { name: 'Wiedervorlage planen' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('form', { name: 'Wiedervorlage planen' })).toBeNull();
    expect(useAppStore.getState().outcomes).toHaveLength(0);
  });

  it('leitet die Wiedervorlage aus dem Vertragsende ab', async () => {
    const user = userEvent.setup();
    render(<QueueView />);
    await user.keyboard('2');
    const form = screen.getByRole('form', { name: 'Wiedervorlage planen' });
    await user.click(within(form).getByText('Vertragsende bekannt'));

    const select = within(form).getByLabelText('Vertragsende');
    const options = within(select).getAllByRole('option') as HTMLOptionElement[];
    // Laufender Monat liegt zu nah: jetzt einen Termin vereinbaren
    await user.selectOptions(select, options[1]?.value ?? '');
    expect(within(form).getByRole('alert')).toHaveTextContent('zu nah');
    expect(within(form).getByRole('button', { name: 'Wiedervorlage speichern' })).toBeDisabled();

    // In zwei Jahren: neun Monate vorher
    const later = options[25]?.value ?? '';
    await user.selectOptions(select, later);
    expect(within(form).getByText(/Monate vor Vertragsende/)).toBeInTheDocument();
    await user.click(within(form).getByRole('button', { name: 'Wiedervorlage speichern' }));
    await waitFor(() => expect(useAppStore.getState().recalls).toHaveLength(1));

    const recall = useAppStore.getState().recalls[0];
    expect(recall).toMatchObject({ reason: 'contractEnd', contractEnd: later, dueTime: null });
    expect(recall?.dueDate.slice(8)).toMatch(/^0[1-3]$/);
  });
});
