import { describe, expect, it } from 'vitest';
import {
  MIN_CALLS_FOR_CALIBRATION,
  auc,
  calibrate,
  fitLogistic,
  invert,
  ratesByBin,
  solve,
  toRawWeights,
} from '@/domain/calibration';
import { createRandom } from '@/domain/sampling';
import { DEFAULT_WEIGHTS } from '@/domain/scoring';
import { outcomeFor, simulate } from './simulate';

describe('solve und invert', () => {
  it('lösen kleine Gleichungssysteme exakt', () => {
    const x = solve(
      [
        [2, 1],
        [1, 3],
      ],
      [3, 5],
    );
    expect(x?.[0]).toBeCloseTo(0.8, 12);
    expect(x?.[1]).toBeCloseTo(1.4, 12);
    const inv = invert([
      [4, 7],
      [2, 6],
    ]);
    expect(inv?.flat().map((v) => Number(v.toFixed(12)))).toEqual([0.6, -0.7, -0.2, 0.4]);
  });

  it('erkennen singuläre Matrizen', () => {
    expect(
      solve(
        [
          [1, 2],
          [2, 4],
        ],
        [1, 2],
      ),
    ).toBeNull();
  });
});

describe('auc', () => {
  it('liefert feste Werte', () => {
    expect(auc([1, 2, 3, 4], [0, 0, 1, 1])).toBe(1);
    expect(auc([4, 3, 2, 1], [0, 0, 1, 1])).toBe(0);
    expect(auc([0.1, 0.4, 0.35, 0.8], [0, 0, 1, 1])).toBe(0.75);
    expect(auc([1, 1], [0, 1])).toBe(0.5);
    expect(auc([1, 2], [1, 1])).toBe(0.5);
  });
});

describe('fitLogistic', () => {
  it('trifft die analytische Lösung bei einem binären Merkmal', () => {
    // x = 0: 2 von 10 Terminen, x = 1: 6 von 10 Terminen
    const x = [...Array.from({ length: 10 }, () => [0]), ...Array.from({ length: 10 }, () => [1])];
    const y = [
      ...Array.from({ length: 10 }, (_, i) => (i < 2 ? 1 : 0)),
      ...Array.from({ length: 10 }, (_, i) => (i < 6 ? 1 : 0)),
    ];
    const fit = fitLogistic(x, y, 0);
    expect(fit?.converged).toBe(true);
    expect(fit?.beta[0]).toBeCloseTo(Math.log(0.25), 8); // -1,386294
    expect(fit?.beta[1]).toBeCloseTo(Math.log(6), 8); // 1,791759
  });

  it('schrumpft Koeffizienten mit L2-Strafterm', () => {
    // x = 0: 1 von 3 Terminen, x = 1: 2 von 3 Terminen, ohne Strafterm β1 = 2 · ln 2
    const x = [[0], [0], [0], [1], [1], [1]];
    const y = [0, 0, 1, 0, 1, 1];
    const plain = fitLogistic(x, y, 0);
    const penalized = fitLogistic(x, y, 1);
    expect(plain?.beta[1]).toBeCloseTo(2 * Math.log(2), 8);
    expect(penalized?.beta[1]).toBeGreaterThan(0);
    expect(penalized?.beta[1]).toBeLessThan(2 * Math.log(2));
  });
});

describe('ratesByBin', () => {
  it('ordnet Grenzwerte eindeutig zu, 100 fällt in die letzte Klasse', () => {
    const outcomes = [
      outcomeFor(1, { fit: 25, proximity: 0, potential: 0, reachability: 0 }, true),
      outcomeFor(2, { fit: 100, proximity: 0, potential: 0, reachability: 0 }, false),
      outcomeFor(3, { fit: 24.9, proximity: 0, potential: 0, reachability: 0 }, false),
    ];
    expect(ratesByBin(outcomes, 'fit')).toEqual([
      { from: 0, to: 25, calls: 1, appointments: 0, rate: 0 },
      { from: 25, to: 50, calls: 1, appointments: 1, rate: 1 },
      { from: 50, to: 75, calls: 0, appointments: 0, rate: null },
      { from: 75, to: 100, calls: 1, appointments: 0, rate: 0 },
    ]);
  });
});

describe('toRawWeights', () => {
  it('skaliert das größte Gewicht auf 50', () => {
    expect(
      toRawWeights({ fit: 50, proximity: 100 / 3, potential: 0, reachability: 50 / 3 }),
    ).toEqual({
      fit: 50,
      proximity: 33,
      potential: 0,
      reachability: 17,
    });
  });
});

describe('calibrate', () => {
  it('rechnet Quoten, aber keinen Vorschlag unter 300 Anrufen', () => {
    const report = calibrate(simulate(MIN_CALLS_FOR_CALIBRATION - 1), DEFAULT_WEIGHTS);
    expect(report.status).toBe('too_few_calls');
    expect(report.suggestion).toBeNull();
    expect(report.missingCalls).toBe(1);
    expect(report.calls).toBe(299);
    const bandCalls = report.byBand.A.calls + report.byBand.B.calls + report.byBand.C.calls;
    expect(bandCalls).toBe(299);
    expect(report.byDimension.fit.reduce((s, b) => s + b.calls, 0)).toBe(299);
  });

  it('rechnet ab genau 300 Anrufen einen Vorschlag', () => {
    const report = calibrate(simulate(MIN_CALLS_FOR_CALIBRATION), DEFAULT_WEIGHTS);
    expect(report.status).toBe('ok');
    expect(report.missingCalls).toBe(0);
  });

  it('findet den simulierten Zusammenhang wieder', () => {
    const report = calibrate(simulate(4000), DEFAULT_WEIGHTS);
    const s = report.suggestion;
    expect(report.status).toBe('ok');
    expect(s).not.toBeNull();
    if (!s) return;
    // Wahre Verhältnisse 3 : 2 : 0 : 1, also 50 : 33 : 0 : 17
    expect(s.normalizedWeights.fit).toBeGreaterThan(42);
    expect(s.normalizedWeights.fit).toBeLessThan(58);
    expect(s.normalizedWeights.proximity).toBeGreaterThan(25);
    expect(s.normalizedWeights.proximity).toBeLessThan(41);
    expect(s.normalizedWeights.potential).toBeLessThan(8);
    expect(s.normalizedWeights.reachability).toBeGreaterThan(9);
    expect(s.normalizedWeights.reachability).toBeLessThan(25);
    const total = Object.values(s.normalizedWeights).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(100, 10);
    expect(s.coefficients.fit.significant).toBe(true);
    expect(s.coefficients.potential.significant).toBe(false);
    expect(s.rawWeights.fit).toBe(50);
    expect(s.aucSuggested).toBeGreaterThan(s.aucCurrent);
  });

  it('ist deterministisch und verändert die Eingaben nicht', () => {
    const data = simulate(500);
    const weights = { ...DEFAULT_WEIGHTS };
    const snapshot = JSON.stringify(data);
    expect(calibrate(data, weights)).toEqual(calibrate(data, weights));
    expect(JSON.stringify(data)).toBe(snapshot);
    expect(weights).toEqual(DEFAULT_WEIGHTS);
  });

  it('macht keinen Vorschlag ohne Termine', () => {
    const data = simulate(400).map((o) => ({ ...o, outcome: 'not_reached' as const }));
    expect(calibrate(data, DEFAULT_WEIGHTS).status).toBe('single_class');
  });

  it('macht keinen Vorschlag, wenn keine Dimension positiv wirkt', () => {
    const random = createRandom(7);
    const data = Array.from({ length: 1000 }, (_, i) => {
      const v = random() * 100;
      const d = { fit: v, proximity: v, potential: v, reachability: v };
      return outcomeFor(i, d, random() < 1 / (1 + Math.exp(-(1 - 3 * (v / 100)))));
    });
    const report = calibrate(data, DEFAULT_WEIGHTS);
    expect(report.status).toBe('no_positive_effect');
    expect(report.suggestion).toBeNull();
  });
});
