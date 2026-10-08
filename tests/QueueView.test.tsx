import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { todayLocal } from '@/app/selectors';
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
  const open = vi.spyOn(window, 'open').mockImplementation(() => null);

  afterEach(() => open.mockClear());

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
    await waitFor(() => expect(selectedName()).not.toBe(first));

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

  it('öffnet mit Termin vereinbaren den Salesforce-Kalender in der Wochenansicht', async () => {
    const user = userEvent.setup();
    render(<QueueView />);
    const first = selectedName();

    await user.click(screen.getByRole('button', { name: /Termin vereinbaren/ }));

    expect(open).toHaveBeenCalledTimes(1);
    expect(open.mock.calls[0]?.[0]).toBe(
      `https://cws-workwear.lightning.force.com/lightning/o/Event/home?startDate=${todayLocal()}&view=week`,
    );
    await waitFor(() => expect(useAppStore.getState().outcomes).toHaveLength(1));
    expect(useAppStore.getState().outcomes[0]).toMatchObject({
      leadName: first,
      outcome: 'appointment',
    });
  });

  it('öffnet den Kalender auch über Taste 1', async () => {
    const user = userEvent.setup();
    render(<QueueView />);
    await user.keyboard('1');
    expect(open).toHaveBeenCalledTimes(1);
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
    expect(within(bar).getByRole('button', { name: /Termin vereinbaren/ })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: /Wiedervorlage/ })).toBeInTheDocument();
  });

  it('plant mit Taste 2 eine Wiedervorlage mit Datum, Uhrzeit und der Notiz aus dem Protokoll', async () => {
    const user = userEvent.setup();
    render(<QueueView />);
    const first = selectedName();

    await user.keyboard('2');
    const form = screen.getByRole('form', { name: 'Wiedervorlage planen' });
    // Noch nichts gebucht, erst nach dem Speichern
    expect(useAppStore.getState().outcomes).toHaveLength(0);
    expect(within(form).getByLabelText('Datum')).toHaveValue(nextBusinessDay(new Date()));

    await user.type(screen.getByLabelText('Notiz zum Telefonat'), 'Einkauf entscheidet mit');
    await user.type(within(form).getByLabelText('Uhrzeit (optional)'), '14:00');
    await user.click(within(form).getByRole('button', { name: 'Wiedervorlage speichern' }));
    await waitFor(() => expect(useAppStore.getState().recalls).toHaveLength(1));

    const { outcomes, recalls } = useAppStore.getState();
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toMatchObject({
      leadName: first,
      outcome: 'callback',
      recallReason: 'callback',
    });
    expect(recalls[0]).toMatchObject({
      leadName: first,
      reason: 'callback',
      dueDate: nextBusinessDay(new Date()),
      dueTime: '14:00',
      note: 'Einkauf entscheidet mit',
      createdAt: outcomes[0]?.recordedAt,
    });
    // Anrufprotokoll und Wiedervorlage gehen automatisch an Salesforce, mit Demo-Daten simuliert
    await waitFor(() =>
      expect(useAppStore.getState().syncItems.map((item) => [item.task.kind, item.status])).toEqual(
        [
          ['callLog', 'demo'],
          ['recall', 'demo'],
        ],
      ),
    );
    expect(screen.queryByRole('form', { name: 'Wiedervorlage planen' })).toBeNull();
    expect(selectedName()).not.toBe(first);
  });

  it('speichert das Gesprächsprotokoll mit dem Ergebnis und schickt es an Salesforce', async () => {
    const user = userEvent.setup();
    render(<QueueView />);
    const protocol = screen.getByRole('group', { name: 'Gesprächsprotokoll' });
    expect(within(protocol).getByLabelText('Wettbewerber')).toBeDisabled();

    await user.selectOptions(within(protocol).getByLabelText('Gesprächspartner'), 'Entscheider');
    await user.selectOptions(
      within(protocol).getByLabelText('Aktuelle Lösung'),
      'Wettbewerb (Mietservice)',
    );
    await user.selectOptions(within(protocol).getByLabelText('Wettbewerber'), 'MEWA');
    await user.click(within(protocol).getByLabelText('Zentralentscheidung'));
    await user.type(within(protocol).getByLabelText('Notiz zum Telefonat'), 'Vertrag bis 2027');
    await user.click(screen.getByRole('button', { name: /Kein Interesse/ }));

    await waitFor(() => expect(useAppStore.getState().outcomes).toHaveLength(1));
    expect(useAppStore.getState().outcomes[0]?.protocol).toEqual({
      contactRole: 'decisionMaker',
      solution: 'competitor',
      competitor: 'MEWA',
      companyDissolved: false,
      centralDecision: true,
      existingCustomer: false,
      doNotCall: false,
      note: 'Vertrag bis 2027',
    });
    await waitFor(() => expect(useAppStore.getState().syncItems).toHaveLength(1));
    const task = useAppStore.getState().syncItems[0]?.task;
    expect(task).toMatchObject({
      kind: 'callLog',
      status: 'Completed',
      callDisposition: 'Kein Interesse',
    });
    expect(task?.description).toContain('Aktuelle Lösung: Wettbewerb: MEWA');
    expect(task?.description).toContain('Hinweise: Zentralentscheidung');
    // Nächster Lead beginnt mit leerem Protokoll
    await waitFor(() =>
      expect(within(protocol).getByLabelText('Notiz zum Telefonat')).toHaveValue(''),
    );
  });

  it('schlägt bei Wettbewerb das Vertragsende als Grund der Wiedervorlage vor', async () => {
    const user = userEvent.setup();
    render(<QueueView />);
    await user.selectOptions(screen.getByLabelText('Aktuelle Lösung'), 'Wettbewerb (Mietservice)');
    await user.click(screen.getByRole('button', { name: /Wiedervorlage/ }));
    const form = screen.getByRole('form', { name: 'Wiedervorlage planen' });
    expect(within(form).getByLabelText('Vertragsende')).toBeInTheDocument();
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
