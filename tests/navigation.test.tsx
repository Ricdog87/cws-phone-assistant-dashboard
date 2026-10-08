import { act, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '@/app/App';
import { todayLocal } from '@/app/selectors';
import { useAppStore } from '@/app/store';

describe('Navigation der Telefonassistenz', () => {
  it('öffnet mit Termine den Salesforce-Kalender in der Wochenansicht statt einer Seite', () => {
    act(() => useAppStore.getState().signIn('assistant'));
    render(<App />);
    const nav = screen.getByRole('navigation', { name: 'Bereiche' });
    const termine = within(nav).getByRole('link', { name: /Termine/ });
    expect(termine).toHaveAttribute(
      'href',
      `https://cws-workwear.lightning.force.com/lightning/o/Event/home?startDate=${todayLocal()}&view=week`,
    );
    expect(termine).toHaveAttribute('target', '_blank');
    expect(within(nav).getByRole('button', { name: 'Anrufliste' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
