import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { todayLocal } from '@/app/selectors';
import { useAppStore } from '@/app/store';
import { demoEarlierAppointments } from '@/data/demoAppointments';
import { demoPastWeek } from '@/data/demoHistory';
import { demoRecalls } from '@/data/demoRecalls';
import { LIVE_ASSISTANT_ID } from '@/data/demoTeam';
import { MockProvider } from '@/data/providers/mockProvider';
import { isInCooldown } from '@/domain/activity';
import { recallBucket, suggestRecallDate } from '@/domain/recall';
import { AppointmentsView } from '@/features/appointments/AppointmentsView';
import { RecallsView } from '@/features/recalls/RecallsView';
import { makeOutcome } from './fixtures';

const NOW = new Date(2026, 9, 8, 12);

beforeEach(async () => {
  await act(async () => {
    await useAppStore.getState().clearOutcomes();
    await useAppStore.getState().loadFromProvider(new MockProvider());
  });
  act(() => useAppStore.getState().signIn('assistant'));
});

describe('demoRecalls', () => {
  it('legt stabile Wiedervorlagen aus der Liste des Hunters an, außerhalb der Sperrfrist', () => {
    const { leads } = useAppStore.getState();
    const first = demoRecalls(leads, 'Jonas Tiedemann', NOW);
    expect(demoRecalls(leads, 'Jonas Tiedemann', NOW)).toEqual(first);
    expect(first).toHaveLength(9);
    const byId = new Map(leads.map((lead) => [lead.id, lead]));
    for (const recall of first) {
      const lead = byId.get(recall.leadId);
      expect(lead?.owner).toBe('Jonas Tiedemann');
      expect(isInCooldown(lead?.lastActivity, '2026-10-08')).toBe(false);
      expect(recall.createdAt < NOW.toISOString()).toBe(true);
      if (recall.contractEnd) {
        expect(recall.dueDate).toBe(suggestRecallDate(recall.contractEnd, NOW));
      }
    }
    const buckets = first.map((recall) => recallBucket(recall.dueDate, '2026-10-08'));
    expect(buckets.filter((b) => b === 'overdue')).toHaveLength(2);
    expect(buckets.filter((b) => b === 'today')).toHaveLength(2);
  });
});

describe('demoEarlierAppointments', () => {
  it('bucht je Firma höchstens einen Termin und nie bei offener Wiedervorlage', () => {
    const { leads } = useAppStore.getState();
    const recallNames = new Set(
      demoRecalls(leads, 'Jonas Tiedemann', NOW).map((recall) => recall.leadName),
    );
    const rows = demoEarlierAppointments(leads, 'Jonas Tiedemann', 'Nele Faber', NOW);
    expect(rows.length).toBeGreaterThan(0);
    const names = rows.map((row) => row.leadName);
    expect(new Set(names).size).toBe(names.length);
    expect(names.filter((name) => recallNames.has(name))).toEqual([]);
    expect(rows.every((row) => row.status === 'entered' && row.bookedAt < NOW.toISOString())).toBe(
      true,
    );
  });
});

describe('RecallsView', () => {
  it('zeigt fällige Wiedervorlagen zuerst und öffnet den Account in der Anrufliste', async () => {
    const user = userEvent.setup();
    render(<RecallsView />);
    const today = screen.getByRole('list', { name: 'Wiedervorlagen Heute' });
    const rows = within(today).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(screen.getByRole('list', { name: 'Wiedervorlagen Überfällig' })).toBeInTheDocument();

    const name = rows[0]?.querySelector('.font-bold.truncate')?.textContent ?? '';
    await user.click(within(rows[0] as HTMLElement).getByRole('button', { name: 'Anrufen' }));
    const state = useAppStore.getState();
    expect(state.activeTab).toBe('queue');
    const lead = state.leads.find((item) => item.id === state.selectedLeadId);
    expect(lead?.name).toBe(name);
  });

  it('schließt eine Wiedervorlage, sobald der Account erneut angerufen ist', async () => {
    const { leads, ownerFilter } = useAppStore.getState();
    const due = demoRecalls(leads, ownerFilter ?? '', new Date(`${todayLocal()}T12:00:00`)).find(
      (recall) => recall.dueDate === todayLocal(),
    );
    render(<RecallsView />);
    expect(screen.getByText(due?.leadName ?? '')).toBeInTheDocument();
    await act(async () => {
      await useAppStore.getState().addOutcome(
        makeOutcome({
          id: 'neu',
          leadId: due?.leadId,
          leadName: due?.leadName,
          outcome: 'not_reached',
          recordedAt: new Date().toISOString(),
        }),
      );
    });
    expect(screen.queryByText(due?.leadName ?? '')).toBeNull();
  });
});

describe('AppointmentsView', () => {
  it('zeigt die Woche mit Status in Salesforce und die Vorwochen', async () => {
    const member = {
      id: LIVE_ASSISTANT_ID,
      givenName: '',
      familyName: '',
      dayCalls: 0,
      weekCalls: 0,
      weekAppointments: 0,
      live: true,
    };
    const earlier = [1, 2].reduce(
      (sum, back) => sum + demoPastWeek(member, new Date(), back).appointments,
      0,
    );
    const lead = useAppStore.getState().leads.find((item) => item.owner === 'Jonas Tiedemann');
    await act(async () => {
      await useAppStore.getState().addOutcome(
        makeOutcome({
          id: 'termin',
          leadId: lead?.id,
          leadName: lead?.name,
          owner: lead?.owner,
          outcome: 'appointment',
          recordedAt: new Date().toISOString(),
        }),
      );
    });
    render(<AppointmentsView />);
    expect(screen.getByText('Diese Woche (1)')).toBeInTheDocument();
    expect(screen.getByText(`Vorwochen (${earlier})`)).toBeInTheDocument();
    expect(screen.getByText(lead?.name ?? '')).toBeInTheDocument();
    expect(screen.getAllByText('Noch nicht in Salesforce').length).toBeGreaterThan(0);
  });
});
