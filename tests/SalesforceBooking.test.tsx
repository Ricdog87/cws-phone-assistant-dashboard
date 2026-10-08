import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { todayLocal } from '@/app/selectors';
import { useAppStore } from '@/app/store';
import { SalesforceBooking } from '@/features/queue/SalesforceBooking';
import { makeLead } from './fixtures';

const BASE = 'https://beispiel.lightning.force.com';
const ACCOUNT = '001000000000001AAA';

describe('SalesforceBooking', () => {
  beforeEach(async () => {
    await act(async () => {
      await useAppStore.getState().clearOutcomes();
    });
  });

  it('öffnet den Salesforce-Kalender in der Wochenansicht und merkt sich das', async () => {
    const user = userEvent.setup();
    const lead = makeLead({
      id: ACCOUNT,
      name: 'Metallbau Beispiel GmbH',
      owner: 'Jonas Tiedemann',
    });
    render(<SalesforceBooking lead={lead} salesforceUrl={BASE} />);

    const link = screen.getByRole('link', { name: 'Salesforce-Kalender öffnen' });
    expect(link).toHaveAttribute(
      'href',
      `${BASE}/lightning/o/Event/home?startDate=${todayLocal()}&view=week`,
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'Account in Salesforce öffnen' })).toBeInTheDocument();
    expect(screen.getByText('Noch nicht in Salesforce')).toBeInTheDocument();

    link.addEventListener('click', (event) => event.preventDefault());
    await user.click(link);
    expect(useAppStore.getState().appointments[0]).toMatchObject({
      leadId: ACCOUNT,
      hunterName: 'Jonas Tiedemann',
    });
    expect(useAppStore.getState().appointments[0]?.salesforceOpenedAt).toBeTruthy();
    expect(screen.getByText('In Salesforce eingetragen')).toBeInTheDocument();
  });

  it('weist ohne hinterlegte Salesforce-Adresse darauf hin', () => {
    render(<SalesforceBooking lead={makeLead()} salesforceUrl={null} />);
    expect(screen.getByRole('note')).toHaveTextContent('Salesforce-Adresse ist nicht hinterlegt');
    expect(screen.queryByRole('link')).toBeNull();
  });
});
