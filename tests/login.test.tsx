import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { LoginScreen } from '@/app/login/LoginScreen';
import { DEMO_ACCOUNTS, SESSION_STORAGE_KEY, loadSession } from '@/app/session';
import { useAppStore } from '@/app/store';

describe('Demo-Konten', () => {
  it('nutzt die reservierte Beispiel-Domain und je eine Rolle', () => {
    expect(DEMO_ACCOUNTS.map((a) => [a.fullName, a.email, a.role, a.scope])).toEqual([
      ['Nele Faber', 'nele.faber@cws.example', 'Telefonassistenz', 'Team Nord'],
      ['Martina Weidmann', 'martina.weidmann@cws.example', 'Teamleitung', 'Region Nord'],
      ['Steffen Sixthor', 'steffen.sixthor@cws.example', 'Vertriebsleitung', 'Deutschland'],
    ]);
  });
});

describe('LoginScreen', () => {
  beforeEach(() => {
    sessionStorage.clear();
    act(() => useAppStore.getState().signOut());
  });

  it('fragt kein Passwort ab', async () => {
    const user = userEvent.setup();
    const { container } = render(<LoginScreen stepMs={0} />);
    await user.click(screen.getByRole('button', { name: 'Mit Firmenkonto anmelden (SSO)' }));
    expect(container.querySelector('input')).toBeNull();
  });

  it('meldet als Vertriebsleitung an und merkt sich die Sitzung im Tab', async () => {
    const user = userEvent.setup();
    render(<LoginScreen stepMs={0} />);
    await user.click(screen.getByRole('button', { name: 'Mit Firmenkonto anmelden (SSO)' }));
    await user.click(screen.getByRole('button', { name: /Steffen Sixthor/ }));

    await screen.findByText('Ansicht wird vorbereitet');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    const state = useAppStore.getState();
    expect(state.signedIn).toBe(true);
    expect(state.viewLevel).toBe('director');
    expect(state.activeTab).toBe('dashboard');
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBe('director');
    expect(loadSession()).toBe('director');
  });

  it('führt die Telefonassistenz in die Anrufliste', () => {
    act(() => useAppStore.getState().signIn('assistant'));
    expect(useAppStore.getState().activeTab).toBe('queue');
  });

  it('Abmelden beendet die Sitzung', () => {
    act(() => useAppStore.getState().signIn('teamLead'));
    act(() => useAppStore.getState().signOut());
    expect(useAppStore.getState().signedIn).toBe(false);
    expect(loadSession()).toBeNull();
  });

  it('ignoriert unbekannte Werte im Speicher', () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'admin');
    expect(loadSession()).toBeNull();
  });
});
