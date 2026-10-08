import { act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createAppStore } from '@/app/store';
import { InMemoryRecallRepository } from '@/data/recallRepository';
import { InMemoryContactRepository } from '@/data/contactRepository';
import { InMemoryOutcomeRepository } from '@/data/repository';
import { InMemorySyncRepository } from '@/data/syncRepository';
import { callLogTask, needsSync, recallTask, relatedIds } from '@/domain/salesforceSync';
import type { Recall } from '@/domain/types';
import { makeOutcome } from './fixtures';

describe('Aufgaben für Salesforce', () => {
  it('verknüpft Accounts als Bezug und Leads als Name, Demo-IDs gar nicht', () => {
    expect(relatedIds('001000000000001AAA')).toEqual({
      whatId: '001000000000001AAA',
      whoId: null,
    });
    expect(relatedIds('00Q000000000001AAA')).toEqual({
      whatId: null,
      whoId: '00Q000000000001AAA',
    });
    expect(relatedIds('DEMO-1')).toEqual({ whatId: null, whoId: null });
  });

  it('schreibt das Anrufprotokoll mit Ergebnis, Lösung, Hinweisen und Ansprechpartner', () => {
    const task = callLogTask(
      makeOutcome({
        leadId: '001000000000001AAA',
        leadName: 'Bau Fehn GmbH',
        outcome: 'not_interested',
        recordedAt: new Date(2026, 9, 8, 10).toISOString(),
        protocol: {
          contactRole: 'decisionMaker',
          solution: 'competitor',
          competitor: 'DBL',
          companyDissolved: false,
          centralDecision: false,
          existingCustomer: false,
          doNotCall: true,
          note: 'Vertrag bis 2027',
        },
      }),
      'Nele Faber',
      {
        id: 'k',
        leadId: '001000000000001AAA',
        leadName: 'Bau Fehn GmbH',
        name: 'Frau Ahlers',
        role: 'Einkauf',
        directDial: '+49 441 123',
        email: null,
        source: 'call',
        capturedAt: '2026-10-08T08:00:00Z',
      },
    );
    expect(task).toMatchObject({
      kind: 'callLog',
      subject: 'Anruf: Bau Fehn GmbH',
      activityDate: '2026-10-08',
      status: 'Completed',
      callDisposition: 'Kein Interesse',
      whatId: '001000000000001AAA',
      whoId: null,
    });
    expect(task.description.split('\n')).toEqual([
      'Ergebnis: Kein Interesse',
      'Gesprächspartner: Entscheider',
      'Aktuelle Lösung: Wettbewerb: DBL',
      'Hinweise: Nicht mehr anrufen',
      'Ansprechpartner: Frau Ahlers, Einkauf',
      'Durchwahl: +49 441 123',
      'Notiz: Vertrag bis 2027',
      'Hunter: Jonas Tiedemann',
      'Erfasst von Nele Faber über das Lead-Cockpit.',
    ]);
  });

  it('schreibt ein gespeichertes Protokoll ohne Ergebnis als offen', () => {
    const task = callLogTask(
      {
        leadId: 'DEMO-1',
        leadName: 'Bau Fehn GmbH',
        owner: null,
        outcome: null,
        recordedAt: new Date(2026, 9, 8, 10).toISOString(),
        protocol: {
          contactRole: 'gatekeeper',
          solution: 'companyBuys',
          competitor: null,
          companyDissolved: false,
          centralDecision: false,
          existingCustomer: false,
          doNotCall: false,
          note: null,
        },
      },
      'Nele Faber',
    );
    expect(task).toMatchObject({ kind: 'callLog', status: 'Completed', callDisposition: null });
    expect(task.description.split('\n').slice(0, 3)).toEqual([
      'Ergebnis: noch offen',
      'Gesprächspartner: Zentrale',
      'Aktuelle Lösung: Kauft Berufskleidung',
    ]);
  });

  it('legt die Wiedervorlage als offene Aufgabe mit Erinnerung an', () => {
    const recall: Recall = {
      id: 'r',
      leadId: 'DEMO-1',
      leadName: 'Bau Fehn GmbH',
      hunterName: 'Jonas Tiedemann',
      reason: 'callback',
      dueDate: '2026-10-12',
      dueTime: '14:00',
      contractEnd: null,
      note: 'Einkauf entscheidet mit',
      createdAt: '2026-10-08T08:00:00Z',
    };
    const task = recallTask(recall, 'Nele Faber');
    expect(task).toMatchObject({
      kind: 'recall',
      subject: 'Wiedervorlage: Bau Fehn GmbH',
      activityDate: '2026-10-12',
      status: 'Not Started',
      reminderAt: new Date('2026-10-12T14:00:00').toISOString(),
      whatId: null,
      whoId: null,
    });
    expect(task.description).toContain('Notiz: Einkauf entscheidet mit');
  });
});

describe('Postausgang nach Salesforce', () => {
  function store(status: 'synced' | 'notConnected' | 'failed') {
    const sender = vi
      .fn()
      .mockResolvedValue({ status, salesforceId: status === 'synced' ? '00T1' : null });
    const useStore = createAppStore(
      new InMemoryOutcomeRepository(),
      new InMemoryContactRepository(),
      new InMemoryRecallRepository(),
      new InMemorySyncRepository(),
      sender,
    );
    // Eigene Daten statt Demo: dann wird wirklich übertragen
    useStore.setState({ sourceId: 'csv' });
    return { useStore, sender };
  }

  const task = recallTask(
    {
      id: 'r',
      leadId: '00Q000000000001AAA',
      leadName: 'Bau Fehn GmbH',
      hunterName: null,
      reason: 'callback',
      dueDate: '2026-10-12',
      dueTime: null,
      contractEnd: null,
      note: null,
      createdAt: '2026-10-08T08:00:00Z',
    },
    'Nele Faber',
  );

  it('überträgt offene Einträge und merkt sich die ID aus Salesforce', async () => {
    const { useStore, sender } = store('synced');
    await act(async () => {
      await useStore.getState().enqueueSync('r', task);
      await useStore.getState().flushSync();
    });
    expect(sender).toHaveBeenCalledWith(task, null);
    expect(useStore.getState().syncItems[0]).toMatchObject({
      status: 'synced',
      salesforceId: '00T1',
      attempts: 1,
    });
    // Übertragenes geht nicht noch einmal raus
    await act(async () => useStore.getState().flushSync());
    expect(sender).toHaveBeenCalledTimes(1);
  });

  it('hält Einträge ohne Verbindung zurück und versucht es später erneut', async () => {
    const { useStore, sender } = store('notConnected');
    await act(async () => {
      await useStore.getState().enqueueSync('r', task);
      await useStore.getState().flushSync();
    });
    expect(useStore.getState().syncItems[0]?.status).toBe('notConnected');
    const item = useStore.getState().syncItems[0];
    expect(item && needsSync(item)).toBe(true);
    await act(async () => useStore.getState().flushSync());
    expect(sender).toHaveBeenCalledTimes(2);
  });

  it('aktualisiert nach einer Änderung dieselbe Aufgabe statt eine zweite anzulegen', async () => {
    const { useStore, sender } = store('synced');
    const changed = { ...task, description: 'Grund: Rückruf vereinbart\nNotiz: neu' };
    await act(async () => {
      await useStore.getState().enqueueSync('r', task);
      await useStore.getState().flushSync();
      await useStore.getState().enqueueSync('r', changed);
    });
    expect(useStore.getState().syncItems[0]).toMatchObject({
      status: 'pending',
      salesforceId: '00T1',
    });
    await act(async () => useStore.getState().flushSync());
    expect(sender).toHaveBeenLastCalledWith(changed, '00T1');
    expect(useStore.getState().syncItems).toHaveLength(1);
    expect(useStore.getState().syncItems[0]?.status).toBe('synced');
  });

  it('schickt eine Änderung während der Übertragung gleich hinterher', async () => {
    let release: () => void = () => undefined;
    const sender = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = () => resolve({ status: 'synced', salesforceId: '00T1' });
          }),
      )
      .mockResolvedValue({ status: 'synced', salesforceId: '00T1' });
    const useStore = createAppStore(
      new InMemoryOutcomeRepository(),
      new InMemoryContactRepository(),
      new InMemoryRecallRepository(),
      new InMemorySyncRepository(),
      sender,
    );
    useStore.setState({ sourceId: 'csv' });
    const changed = { ...task, description: 'geändert' };
    await act(async () => {
      await useStore.getState().enqueueSync('r', task);
      const flushing = useStore.getState().flushSync();
      await useStore.getState().enqueueSync('r', changed);
      release();
      await flushing;
    });
    expect(sender).toHaveBeenCalledTimes(2);
    expect(sender).toHaveBeenNthCalledWith(1, task, null);
    // Zweiter Durchlauf aktualisiert die gerade angelegte Aufgabe
    expect(sender).toHaveBeenNthCalledWith(2, changed, '00T1');
    expect(useStore.getState().syncItems[0]).toMatchObject({
      task: changed,
      status: 'synced',
      salesforceId: '00T1',
    });
  });

  it('simuliert die Übertragung mit Demo-Daten', async () => {
    const { useStore, sender } = store('synced');
    useStore.setState({ sourceId: 'mock' });
    await act(async () => {
      await useStore.getState().enqueueSync('r', task);
      await useStore.getState().flushSync();
    });
    expect(sender).not.toHaveBeenCalled();
    expect(useStore.getState().syncItems[0]?.status).toBe('demo');
  });
});
