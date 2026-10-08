import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ASSIGNMENTS_STORAGE_KEY, loadAssignments } from '@/app/assignments';
import { useAppStore } from '@/app/store';

describe('Zuordnung Telefonassistenz zu Hunter', () => {
  beforeEach(() => {
    localStorage.removeItem(ASSIGNMENTS_STORAGE_KEY);
    act(() => useAppStore.getState().signIn('assistant'));
  });

  it('startet die Telefonassistenz mit der Leadliste ihres Hunters', () => {
    const { assignments, ownerFilter } = useAppStore.getState();
    expect(ownerFilter).toBe(assignments['nele-faber']);
    expect(ownerFilter).toBe('Jonas Tiedemann');
  });

  it('speichert eine neue Zuordnung und stellt die Leadliste um', () => {
    act(() => useAppStore.getState().setAssignment('nele-faber', 'Malte Hartwig'));
    expect(useAppStore.getState().ownerFilter).toBe('Malte Hartwig');
    expect(loadAssignments()?.['nele-faber']).toBe('Malte Hartwig');
  });

  it('ändert bei anderen Personen nur die Zuordnung, nicht die eigene Liste', () => {
    act(() => useAppStore.getState().setAssignment('nele-faber', 'Jonas Tiedemann'));
    act(() => useAppStore.getState().setAssignment('jana-osterkamp', 'Malte Hartwig'));
    expect(useAppStore.getState().assignments['jana-osterkamp']).toBe('Malte Hartwig');
    expect(useAppStore.getState().ownerFilter).toBe('Jonas Tiedemann');
  });

  it('hebt eine Zuordnung auf', () => {
    act(() => useAppStore.getState().setAssignment('jana-osterkamp', null));
    expect(useAppStore.getState().assignments['jana-osterkamp']).toBeUndefined();
  });
});
