import { describe, expect, it } from 'vitest';
import {
  dueRecallCount,
  isRecallOpen,
  nextBusinessDay,
  openRecalls,
  recallBucket,
  recallReasonText,
  taskDescription,
  weekdayAfterDays,
} from '@/domain/recall';
import { latestOutcomeByLead } from '@/domain/outcomes';
import type { Recall } from '@/domain/types';
import { makeOutcome } from './fixtures';

function recall(overrides: Partial<Recall>): Recall {
  return {
    id: 'r',
    leadId: 'a',
    leadName: 'Firma A',
    hunterName: 'Jonas Tiedemann',
    reason: 'callback',
    dueDate: '2026-10-09',
    dueTime: null,
    contractEnd: null,
    note: null,
    createdAt: '2026-10-08T09:00:00.000Z',
    salesforceOpenedAt: null,
    ...overrides,
  };
}

describe('Wiedervorlagen', () => {
  it('schlägt den nächsten Werktag vor und überspringt das Wochenende', () => {
    // Donnerstag
    expect(nextBusinessDay(new Date(2026, 9, 8))).toBe('2026-10-09');
    // Freitag auf Montag
    expect(nextBusinessDay(new Date(2026, 9, 9))).toBe('2026-10-12');
    // Samstag plus sieben Tage auf Montag
    expect(weekdayAfterDays(new Date(2026, 9, 3), 7)).toBe('2026-10-12');
  });

  it('bleibt offen, bis ein späteres Ergebnis erfasst ist', () => {
    const item = recall({});
    expect(isRecallOpen(item, undefined)).toBe(true);
    const same = makeOutcome({ leadId: 'a', outcome: 'callback', recordedAt: item.createdAt });
    expect(isRecallOpen(item, same)).toBe(true);
    const later = makeOutcome({
      leadId: 'a',
      outcome: 'not_reached',
      recordedAt: '2026-10-09T10:00:00.000Z',
    });
    expect(isRecallOpen(item, later)).toBe(false);
  });

  it('zeigt je Lead nur die jüngste und sortiert nach Fälligkeit und Uhrzeit', () => {
    const items = [
      recall({ id: '1', leadId: 'a', dueDate: '2026-10-12', createdAt: '2026-10-01T09:00:00Z' }),
      recall({ id: '2', leadId: 'a', dueDate: '2026-10-20', createdAt: '2026-10-05T09:00:00Z' }),
      recall({ id: '3', leadId: 'b', dueDate: '2026-10-09', dueTime: '14:00' }),
      recall({ id: '4', leadId: 'c', dueDate: '2026-10-09', dueTime: '09:30' }),
      recall({ id: '5', leadId: 'd', dueDate: '2026-10-09' }),
      recall({ id: '6', leadId: 'e', dueDate: '2026-10-08', createdAt: '2026-10-02T09:00:00Z' }),
    ];
    const latest = latestOutcomeByLead([
      makeOutcome({
        id: 'x',
        leadId: 'e',
        outcome: 'appointment',
        recordedAt: '2026-10-07T09:00Z',
      }),
    ]);
    expect(openRecalls(items, latest).map((item) => item.id)).toEqual(['4', '3', '5', '2']);
  });

  it('ordnet nach Fälligkeit ein und zählt fällige', () => {
    const today = '2026-10-08';
    expect(recallBucket('2026-10-07', today)).toBe('overdue');
    expect(recallBucket('2026-10-08', today)).toBe('today');
    expect(recallBucket('2026-10-15', today)).toBe('soon');
    expect(recallBucket('2026-10-16', today)).toBe('later');
    expect(
      dueRecallCount(
        [recall({ dueDate: '2026-10-07' }), recall({ dueDate: today }), recall({})],
        today,
      ),
    ).toBe(2);
  });

  it('beschreibt die Aufgabe für Salesforce ohne Telefonnummern', () => {
    expect(recallReasonText({ reason: 'contractEnd', contractEnd: '2027-09' })).toBe(
      'Vertragsende 09/2027',
    );
    expect(
      taskDescription({
        assistantName: 'Nele Faber',
        hunterName: 'Jonas Tiedemann',
        reason: 'callback',
        dueTime: '14:00',
        contractEnd: null,
        note: 'Einkauf entscheidet mit',
      }),
    ).toBe(
      [
        'Angelegt von Nele Faber über das Lead-Cockpit.',
        'Grund: Rückruf vereinbart',
        'Uhrzeit: 14:00 Uhr',
        'Hunter: Jonas Tiedemann',
        'Notiz: Einkauf entscheidet mit',
      ].join('\n'),
    );
  });
});
