import { act, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '@/app/App';
import { useAppStore } from '@/app/store';

describe('Navigation der Telefonassistenz', () => {
  it('zeigt keinen Kalender-Link, der Kalender ist in Salesforce ohnehin offen', () => {
    act(() => useAppStore.getState().signIn('assistant'));
    render(<App />);
    const nav = screen.getByRole('navigation', { name: 'Bereiche' });
    expect(within(nav).queryByRole('link')).toBeNull();
    expect(within(nav).queryByText(/Termine/)).toBeNull();
    expect(within(nav).getByRole('button', { name: 'Anrufliste' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
