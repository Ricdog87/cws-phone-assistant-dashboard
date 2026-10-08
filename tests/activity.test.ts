import { describe, expect, it } from 'vitest';
import { activityLabel, daysSinceActivity, parseActivityDate } from '@/domain/activity';

describe('daysSinceActivity', () => {
  it('zählt volle Tage bis heute', () => {
    expect(daysSinceActivity('2026-10-01', '2026-10-08')).toBe(7);
    expect(daysSinceActivity('2026-10-08T15:00:00Z', '2026-10-08')).toBe(0);
  });

  it('liefert null ohne Aktivität', () => {
    expect(daysSinceActivity(null, '2026-10-08')).toBeNull();
    expect(daysSinceActivity(undefined, '2026-10-08')).toBeNull();
  });
});

describe('activityLabel', () => {
  it.each([
    [null, 'keine Aktivität'],
    [0, 'heute'],
    [1, 'gestern'],
    [5, 'vor 5 Tagen'],
    [21, 'vor 3 Wochen'],
    [150, 'vor 5 Monaten'],
    [800, 'vor 2 Jahren'],
  ] as const)('%s Tage ergibt „%s“', (days, label) => {
    expect(activityLabel(days)).toBe(label);
  });
});

describe('parseActivityDate', () => {
  it('liest deutsche und ISO-Datumsangaben', () => {
    expect(parseActivityDate('15.09.2026')).toBe('2026-09-15');
    expect(parseActivityDate('1.2.2026')).toBe('2026-02-01');
    expect(parseActivityDate('2026-09-15')).toBe('2026-09-15');
  });

  it('liefert null für Unbekanntes', () => {
    expect(parseActivityDate('gestern')).toBeNull();
    expect(parseActivityDate('')).toBeNull();
  });
});
