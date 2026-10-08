import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '@/app/store';
import { AppointmentConfirm } from '@/features/queue/AppointmentConfirm';
import { makeLead } from './fixtures';

const LEAD = makeLead({
  id: 'L-1',
  name: 'Metallbau Beispiel GmbH',
  street: 'Am Hafen 1',
  postalCode: '26721',
  city: 'Emden',
  contactName: 'Frau Beispiel',
  owner: 'Jonas Tiedemann',
});

describe('AppointmentConfirm', () => {
  beforeEach(async () => {
    await act(async () => {
      await useAppStore.getState().clearOutcomes();
    });
  });

  it('speichert den Termin beim Accountinhaber und bietet die Bestätigung an', async () => {
    const user = userEvent.setup();
    render(<AppointmentConfirm lead={LEAD} callerName="Nele Faber" />);

    expect(screen.getByLabelText('Hunter')).toHaveValue('Jonas Tiedemann');
    expect(screen.getByLabelText('Ansprechpartner')).toHaveValue('Frau Beispiel');
    await user.type(screen.getByLabelText('E-Mail Ansprechpartner'), 'einkauf@beispiel.example');
    await user.click(screen.getByRole('button', { name: 'Termin speichern' }));

    const [saved] = useAppStore.getState().appointments;
    expect(saved).toMatchObject({
      leadId: 'L-1',
      hunterName: 'Jonas Tiedemann',
      hunterEmail: 'jonas.tiedemann@cws.example',
      contactEmail: 'einkauf@beispiel.example',
      location: 'Am Hafen 1, 26721 Emden',
      durationMinutes: 30,
    });

    const link = screen.getByRole('link', { name: 'Bestätigung in Outlook öffnen' });
    const href = link.getAttribute('href') ?? '';
    expect(href.startsWith('mailto:einkauf%40beispiel.example?subject=Terminbest')).toBe(true);
    expect(href).toContain('cc=jonas.tiedemann%40cws.example');
    expect(screen.getByRole('button', { name: 'Kalendereintrag (.ics)' })).toBeInTheDocument();

    // Klick auf die Bestätigung merkt sich den Zeitpunkt für die Teamübersicht
    link.addEventListener('click', (event) => event.preventDefault());
    await user.click(link);
    expect(useAppStore.getState().appointments[0]?.confirmationOpenedAt).toBeTruthy();
    expect(screen.getByText(/Bestätigung erstellt am/)).toBeInTheDocument();
  });

  it('lässt die Hunter-E-Mail leer, wenn der Accountinhaber unbekannt ist', () => {
    render(<AppointmentConfirm lead={{ ...LEAD, owner: 'Unbekannt Importiert' }} callerName="X" />);
    expect(screen.getByLabelText('Hunter')).toHaveValue('Unbekannt Importiert');
    expect(screen.getByLabelText('E-Mail Hunter')).toHaveValue('');
  });

  it('lehnt eine ungültige E-Mail ab', async () => {
    const user = userEvent.setup();
    render(<AppointmentConfirm lead={LEAD} callerName="Nele Faber" />);
    await user.type(screen.getByLabelText('E-Mail Ansprechpartner'), 'kein-at');
    await user.click(screen.getByRole('button', { name: 'Termin speichern' }));
    expect(screen.getByRole('alert')).toHaveTextContent('E-Mail-Adresse prüfen.');
    expect(useAppStore.getState().appointments).toEqual([]);
  });
});
