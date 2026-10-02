import { describe, expect, it } from 'vitest';
import { suggestRecallDate } from '@/domain/recall';

describe('suggestRecallDate', () => {
  it('legt die Wiedervorlage neun Monate vor März 2028 auf den 01.06.2027', () => {
    expect(suggestRecallDate('2028-03', new Date(2026, 9, 2))).toBe('2027-06-01');
  });

  it('bucht jetzt, wenn das Vertragsende schon im Buchungsfenster liegt', () => {
    expect(suggestRecallDate('2026-12', new Date(2026, 9, 2))).toBe('bookNow');
  });

  it('schiebt einen Samstag auf den Montag', () => {
    expect(suggestRecallDate('2027-05', new Date(2026, 0, 15))).toBe('2026-08-03');
  });
});
