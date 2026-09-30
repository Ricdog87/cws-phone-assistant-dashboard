import { describe, expect, it } from 'vitest';
import { CSV_BOM, escapeCsvCell, outcomesToCsv } from '@/domain/export';
import { computeMetrics, latestOutcomeByLead } from '@/domain/outcomes';
import { makeOutcome } from './fixtures';

describe('computeMetrics', () => {
  const outcomes = [
    makeOutcome({ id: '1', band: 'A', outcome: 'appointment' }),
    makeOutcome({ id: '2', band: 'A', outcome: 'not_reached' }),
    makeOutcome({ id: '3', band: 'B', outcome: 'callback' }),
    makeOutcome({ id: '4', band: 'C', outcome: 'appointment', isControl: true }),
  ];

  it('zählt Anrufe, Termine und Termine je 100 Anrufe', () => {
    const m = computeMetrics(outcomes);
    expect(m.total).toEqual({ calls: 4, appointments: 2, per100: 50 });
    expect(m.byBand.A).toEqual({ calls: 2, appointments: 1, per100: 50 });
    expect(m.byBand.B).toEqual({ calls: 1, appointments: 0, per100: 0 });
    expect(m.byBand.C).toEqual({ calls: 1, appointments: 1, per100: 100 });
    expect(m.control).toEqual({ calls: 1, appointments: 1, per100: 100 });
    expect(m.regular.calls).toBe(3);
  });

  it('liefert 0 ohne Anrufe', () => {
    expect(computeMetrics([]).total).toEqual({ calls: 0, appointments: 0, per100: 0 });
  });
});

describe('latestOutcomeByLead', () => {
  it('nimmt das jüngste Ergebnis je Lead', () => {
    const map = latestOutcomeByLead([
      makeOutcome({ id: '1', outcome: 'callback', recordedAt: '2026-09-01T09:00:00Z' }),
      makeOutcome({ id: '2', outcome: 'appointment', recordedAt: '2026-09-02T09:00:00Z' }),
    ]);
    expect(map.get('L-1')?.outcome).toBe('appointment');
  });
});

describe('outcomesToCsv', () => {
  it('schreibt BOM, Semikolon und Dezimalkomma', () => {
    const csv = outcomesToCsv([makeOutcome({ leadName: 'Muster; Söhne "Nord"' })]);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]?.split(';')[0]).toBe('Zeitpunkt');
    expect(lines[1]).toContain('"Muster; Söhne ""Nord"""');
    expect(lines[1]).toContain(
      ';Termin vereinbart;A;81;95,0;100,0;50,0;67,0;30,0;30,0;25,0;15,0;0,50;3,3;nein;1;mock',
    );
  });

  it('maskiert nur bei Bedarf', () => {
    expect(escapeCsvCell('einfach')).toBe('einfach');
    expect(escapeCsvCell('a;b')).toBe('"a;b"');
  });
});
