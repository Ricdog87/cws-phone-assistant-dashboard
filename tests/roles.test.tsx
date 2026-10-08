import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '@/app/store';
import { allowedTab, homeTab, tabsFor } from '@/app/tabs';
import { MockProvider } from '@/data/providers/mockProvider';
import { HunterSelect } from '@/features/queue/HunterSelect';

describe('Reiter je Rolle', () => {
  it('gibt der Telefonassistenz Termine und Wiedervorlagen, aber keine Einstellungen', () => {
    expect(tabsFor('assistant').map((tab) => tab.label)).toEqual([
      'Anrufliste',
      'Termine',
      'Wiedervorlagen',
      'Dashboard',
      'Karte',
    ]);
  });

  it('gibt Teamleitung und Head of Sales Scoring und Daten', () => {
    for (const level of ['teamLead', 'director'] as const) {
      expect(tabsFor(level).map((tab) => tab.label)).toEqual([
        'Dashboard',
        'Karte',
        'Scoring',
        'Daten',
      ]);
      expect(homeTab(level)).toBe('dashboard');
    }
  });

  it('lenkt nicht erlaubte Reiter auf den Startreiter um', () => {
    expect(allowedTab('assistant', 'scoring')).toBe('queue');
    expect(allowedTab('assistant', 'data')).toBe('queue');
    expect(allowedTab('teamLead', 'queue')).toBe('dashboard');
    expect(allowedTab('teamLead', 'recalls')).toBe('dashboard');
    expect(allowedTab('assistant', 'recalls')).toBe('recalls');
    expect(allowedTab('teamLead', 'scoring')).toBe('scoring');
  });

  it('lässt die Telefonassistenz Einstellungen auch über den Store nicht öffnen', () => {
    act(() => useAppStore.getState().signIn('assistant'));
    act(() => useAppStore.getState().setTab('scoring'));
    expect(useAppStore.getState().activeTab).toBe('queue');
    act(() => useAppStore.getState().signIn('teamLead'));
    act(() => useAppStore.getState().setTab('data'));
    expect(useAppStore.getState().activeTab).toBe('data');
  });
});

describe('Hunter in der Anrufliste', () => {
  beforeEach(async () => {
    await act(async () => {
      await useAppStore.getState().loadFromProvider(new MockProvider());
    });
  });

  it('zeigt der Telefonassistenz ihre Zuordnung nur an', () => {
    act(() => useAppStore.getState().signIn('assistant'));
    render(<HunterSelect />);
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByLabelText('Zugeordneter Hunter')).toHaveTextContent('Jonas Tiedemann');
    expect(screen.getByText('Zuordnung durch die Teamleitung')).toBeInTheDocument();
  });

  it('lässt die Führung frei wählen', () => {
    act(() => useAppStore.getState().signIn('teamLead'));
    render(<HunterSelect />);
    expect(screen.getByRole('combobox', { name: 'Hunter' })).toBeInTheDocument();
  });
});
