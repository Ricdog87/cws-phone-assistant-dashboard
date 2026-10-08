import { describe, expect, it } from 'vitest';
import branchen from '@/domain/branchen.json';
import {
  DEFAULT_WEIGHTS,
  INDUSTRY_FALLBACK_SCORE,
  bandFor,
  computeDimensions,
  fitScore,
  normalizeWeights,
  potentialScore,
  reachabilityScore,
  scoreLead,
  sizeFactor,
  weightedScore,
} from '@/domain/scoring';
import type { Dimensions, Lead } from '@/domain/types';

const baseLead: Lead = {
  id: 'L-1',
  name: 'Testbetrieb GmbH',
  industry: 'Fleischverarbeitung',
  street: 'Musterweg 1',
  postalCode: '26122',
  city: 'Oldenburg',
  lat: 53.1,
  lng: 8.0,
  commercialEmployees: 120,
  wearerCount: 110,
  phone: '0441 000000',
  hasDirectDial: true,
  contactName: 'Frau Muster',
  contactRole: 'Leitung Produktion',
  openPositions: 2,
  certification: null,
  siteExpansion: false,
  managementChange: false,
  isCustomer: false,
};

describe('Branchengrundwerte', () => {
  it('liegt je Branche zwischen 0 und 100 und hat eine Begründung', () => {
    const entries = Object.entries(branchen);
    expect(entries.length).toBeGreaterThan(0);
    for (const [name, entry] of entries) {
      expect(entry.grundwert, name).toBeGreaterThanOrEqual(0);
      expect(entry.grundwert, name).toBeLessThanOrEqual(100);
      expect(entry.begruendung.trim(), name).not.toBe('');
    }
  });
});

describe('sizeFactor', () => {
  it.each([
    [19, 0.6],
    [20, 0.85],
    [39, 0.85],
    [40, 1.0],
    [250, 1.0],
    [251, 0.85],
    [399, 0.85],
    [400, 0.6],
    [0, 0.6],
  ])('%i gewerbliche Mitarbeitende ergeben Faktor %f', (employees, factor) => {
    expect(sizeFactor(employees)).toBe(factor);
  });
});

describe('fitScore', () => {
  it('multipliziert Branchengrundwert mit Größenfaktor', () => {
    expect(fitScore({ industry: 'Fleischverarbeitung', commercialEmployees: 120 })).toBe(95);
    expect(fitScore({ industry: 'Metallbau', commercialEmployees: 30 })).toBeCloseTo(74.8, 10);
  });

  it('nutzt den Rückfallwert für unbekannte Branchen', () => {
    expect(fitScore({ industry: 'Unbekannt', commercialEmployees: 10 })).toBeCloseTo(
      INDUSTRY_FALLBACK_SCORE * 0.6,
      10,
    );
  });
});

describe('potentialScore', () => {
  it('teilt die Trägerzahl durch 2,2 und deckelt auf 100', () => {
    expect(potentialScore(110)).toBeCloseTo(50, 10);
    expect(potentialScore(220)).toBeCloseTo(100, 10);
    expect(potentialScore(500)).toBe(100);
  });
});

describe('reachabilityScore', () => {
  const none = {
    hasDirectDial: false,
    contactName: null,
    openPositions: 0,
    certification: null,
    siteExpansion: false,
    managementChange: false,
  };

  it('ergibt 0 ohne Merkmale', () => {
    expect(reachabilityScore(none)).toBe(0);
  });

  it('summiert die Einzelwerte', () => {
    expect(reachabilityScore({ ...none, hasDirectDial: true })).toBe(34);
    expect(reachabilityScore({ ...none, contactName: 'Herr Test' })).toBe(26);
    expect(reachabilityScore({ ...none, openPositions: 2 })).toBe(7);
    expect(reachabilityScore({ ...none, certification: 'IFS Food' })).toBe(6);
    expect(reachabilityScore({ ...none, siteExpansion: true })).toBe(7);
    expect(reachabilityScore({ ...none, managementChange: true })).toBe(5);
  });

  it('deckelt offene Stellen auf 22 und die Summe auf 100', () => {
    expect(reachabilityScore({ ...none, openPositions: 10 })).toBe(22);
    expect(
      reachabilityScore({
        hasDirectDial: true,
        contactName: 'Frau Test',
        openPositions: 10,
        certification: 'IFS Food',
        siteExpansion: true,
        managementChange: true,
      }),
    ).toBe(100);
  });
});

describe('normalizeWeights', () => {
  it('normiert die Standardgewichte im Verhältnis 30 : 25 : 15 auf Summe 100', () => {
    const w = normalizeWeights(DEFAULT_WEIGHTS);
    expect(w.fit).toBeCloseTo(42.857, 3);
    expect(w.potential).toBeCloseTo(35.714, 3);
    expect(w.reachability).toBeCloseTo(21.429, 3);
  });

  it('normiert auf Summe 100', () => {
    expect(normalizeWeights({ fit: 50, potential: 50, reachability: 0 })).toEqual({
      fit: 50,
      potential: 50,
      reachability: 0,
    });
  });

  it('gewichtet gleich, wenn alle Gewichte null sind', () => {
    const w = normalizeWeights({ fit: 0, potential: 0, reachability: 0 });
    for (const value of Object.values(w)) expect(value).toBeCloseTo(100 / 3, 10);
  });

  it('begrenzt Rohwerte auf 0 bis 50', () => {
    expect(normalizeWeights({ fit: 80, potential: -10, reachability: 50 })).toEqual({
      fit: 50,
      potential: 0,
      reachability: 50,
    });
  });
});

describe('weightedScore', () => {
  it('rundet die gewichtete Summe', () => {
    const dims: Dimensions = { fit: 95, potential: 50, reachability: 67 };
    // (95*30 + 50*25 + 67*15) / 70 = 72,93
    expect(weightedScore(dims, DEFAULT_WEIGHTS)).toBe(73);
  });

  it('ergibt bei Gleichgewichtung den Mittelwert', () => {
    const dims: Dimensions = { fit: 90, potential: 60, reachability: 30 };
    expect(weightedScore(dims, { fit: 0, potential: 0, reachability: 0 })).toBe(60);
  });
});

describe('bandFor', () => {
  it.each([
    [100, 'A'],
    [78, 'A'],
    [77, 'B'],
    [58, 'B'],
    [57, 'C'],
    [0, 'C'],
  ] as const)('Score %i ergibt Band %s', (score, band) => {
    expect(bandFor(score)).toBe(band);
  });

  it('trifft die Bandgrenzen auch über den gewichteten Score', () => {
    const at = (v: number): Dimensions => ({ fit: v, potential: v, reachability: v });
    expect(bandFor(weightedScore(at(77), DEFAULT_WEIGHTS))).toBe('B');
    expect(bandFor(weightedScore(at(78), DEFAULT_WEIGHTS))).toBe('A');
    expect(bandFor(weightedScore(at(57), DEFAULT_WEIGHTS))).toBe('C');
    expect(bandFor(weightedScore(at(58), DEFAULT_WEIGHTS))).toBe('B');
  });
});

describe('scoreLead', () => {
  it('bewertet einen Lead ohne Routenbezug vollständig', () => {
    const result = scoreLead(baseLead, DEFAULT_WEIGHTS);
    expect(result.dimensions.fit).toBe(95);
    expect(result.dimensions.potential).toBeCloseTo(50, 10);
    expect(result.dimensions.reachability).toBe(67);
    expect(result.score).toBe(73);
    expect(result.band).toBe('B');
  });

  it('berechnet die Dimensionen nur aus den Lead-Merkmalen', () => {
    expect(computeDimensions(baseLead)).toEqual(scoreLead(baseLead, DEFAULT_WEIGHTS).dimensions);
  });
});
