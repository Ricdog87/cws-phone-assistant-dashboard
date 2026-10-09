import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '@/app/store';
import type { ViewLevel } from '@/app/demoUser';
import { MockProvider } from '@/data/providers/mockProvider';
import { MarketView } from '@/features/market/MarketView';

async function signInAs(level: ViewLevel) {
  await act(async () => {
    await useAppStore.getState().clearOutcomes();
    await useAppStore.getState().loadFromProvider(new MockProvider());
  });
  act(() => useAppStore.getState().signIn(level));
}

/** Firmen in der Auswahl laut Kopf der Nachfass-Liste; die Tabelle zeigt seitenweise */
function listCount(): number {
  const list = screen.getByRole('region', { name: 'Nachfass-Liste' });
  const match = /(\d+) Firmen/.exec(list.textContent ?? '');
  return Number(match?.[1] ?? 0);
}

function listRows(): HTMLElement[] {
  const list = screen.getByRole('region', { name: 'Nachfass-Liste' });
  return within(list).getAllByRole('row').slice(1);
}

describe('Wettbewerb und Vertragsenden', () => {
  beforeEach(() => signInAs('teamLead'));

  it('zeigt der Teamleitung Kennzahlen, Verteilung, Quartale und Branchen', () => {
    render(<MarketView />);
    expect(screen.getByText('Wettbewerb · Team Nord')).toBeInTheDocument();
    for (const label of ['Firmen mit Gespräch', 'Beim Wettbewerb', 'Jetzt nachfassen']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole('region', { name: 'Aktuelle Lösung' })).toHaveTextContent('MEWA');
    expect(screen.getByRole('img', { name: /Vertragsenden je Quartal/ })).toBeInTheDocument();
    const matrix = screen.getByRole('region', { name: 'Branchen und Wettbewerber' });
    expect(within(matrix).getByRole('columnheader', { name: 'Bardusch' })).toBeInTheDocument();
    const list = screen.getByRole('region', { name: 'Nachfass-Liste' });
    expect(within(list).getByRole('columnheader', { name: 'Hunter' })).toBeInTheDocument();
    // Keine Region zur Auswahl, die Teamleitung sieht ihre eigene
    expect(screen.queryByLabelText('Region')).toBeNull();
  });

  it('filtert per Kachel auf fällige Vertragsenden und per Auswahl auf Wettbewerber', async () => {
    const user = userEvent.setup();
    render(<MarketView />);
    const total = listCount();
    await user.click(screen.getByRole('button', { name: /^Jetzt nachfassen/ }));
    const due = listRows();
    expect(due.length).toBeGreaterThan(0);
    expect(listCount()).toBeLessThan(total);
    for (const row of due) expect(row).toHaveTextContent('Jetzt nachfassen');

    await user.click(screen.getByRole('button', { name: /^Jetzt nachfassen/ }));
    const filters = screen.getByRole('search', { name: 'Filter' });
    await user.selectOptions(within(filters).getByLabelText('Aktuelle Lösung'), 'competitor:MEWA');
    for (const row of listRows()) expect(row).toHaveTextContent('MEWA');

    // Klick auf eine Branche in der Tabelle filtert mit
    const matrix = screen.getByRole('region', { name: 'Branchen und Wettbewerber' });
    const first = within(matrix).getAllByRole('button', { pressed: false })[0];
    const industry = first?.textContent ?? '';
    await user.click(first as HTMLElement);
    expect(within(filters).getByLabelText('Branche')).toHaveValue(industry);
    for (const row of listRows()) expect(row).toHaveTextContent(industry);

    await user.click(screen.getByRole('button', { name: 'Alle Filter zurücksetzen' }));
    expect(listCount()).toBe(total);
  });

  it('lässt die Vertriebsleitung nach Region filtern', async () => {
    await signInAs('director');
    const user = userEvent.setup();
    render(<MarketView />);
    expect(screen.getByText('Wettbewerb · Vertriebsgebiet Nordwest')).toBeInTheDocument();
    const filters = screen.getByRole('search', { name: 'Filter' });
    const region = within(filters).getByLabelText('Region');
    const hunters = within(within(filters).getByLabelText('Hunter')).getAllByRole('option').length;
    await user.selectOptions(region, 'nrw');
    // Hunter-Auswahl nur noch aus der Region
    expect(
      within(within(filters).getByLabelText('Hunter')).getAllByRole('option').length,
    ).toBeLessThan(hunters);
    const nrw = listCount();
    await user.selectOptions(region, 'all');
    expect(listCount()).toBeGreaterThan(nrw);
  });

  it('zeigt der Telefonassistenz ihre Leadliste und springt zum Anrufen in die Anrufliste', async () => {
    await signInAs('assistant');
    const user = userEvent.setup();
    render(<MarketView />);
    const owner = useAppStore.getState().ownerFilter;
    expect(screen.getByText(`Wettbewerb · Leadliste ${owner}`)).toBeInTheDocument();
    const list = screen.getByRole('region', { name: 'Nachfass-Liste' });
    expect(within(list).queryByRole('columnheader', { name: 'Hunter' })).toBeNull();
    const call = within(list).getAllByRole('button', { name: 'Anrufen' })[0];
    await user.click(call as HTMLElement);
    expect(useAppStore.getState().activeTab).toBe('queue');
    expect(useAppStore.getState().selectedLeadId).not.toBeNull();
  });
});
