import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '@/app/store';
import { ContactCapture } from '@/features/queue/ContactCapture';

const LEAD = { id: 'L-1', name: 'Metallbau Beispiel GmbH' };

describe('ContactCapture', () => {
  beforeEach(async () => {
    await act(async () => {
      await useAppStore.getState().clearOutcomes();
    });
  });

  it('speichert einen Kontakt und zeigt ihn an', async () => {
    const user = userEvent.setup();
    render(<ContactCapture lead={LEAD} />);
    await user.click(screen.getByRole('button', { name: 'Kontakt erfassen' }));
    await user.type(screen.getByLabelText('Name'), 'Erika Beispiel');
    await user.type(screen.getByLabelText('Funktion'), 'Leitung Einkauf');
    await user.type(screen.getByLabelText('Durchwahl'), '0421 123-45');
    await user.click(screen.getByRole('button', { name: 'Kontakt speichern' }));

    const [saved] = useAppStore.getState().contacts;
    expect(saved).toMatchObject({
      leadId: 'L-1',
      leadName: 'Metallbau Beispiel GmbH',
      name: 'Erika Beispiel',
      role: 'Leitung Einkauf',
      directDial: '0421 123-45',
      email: null,
    });
    expect(screen.getByText('Erika Beispiel, Leitung Einkauf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Weiteren Kontakt erfassen' })).toBeInTheDocument();
  });

  it('meldet ungültige Eingaben und speichert nichts', async () => {
    const user = userEvent.setup();
    render(<ContactCapture lead={LEAD} />);
    await user.click(screen.getByRole('button', { name: 'Kontakt erfassen' }));
    await user.type(screen.getByLabelText('E-Mail'), 'keine-adresse');
    await user.click(screen.getByRole('button', { name: 'Kontakt speichern' }));

    expect(screen.getByRole('alert')).toHaveTextContent('E-Mail-Adresse prüfen.');
    expect(useAppStore.getState().contacts).toEqual([]);
  });
});
