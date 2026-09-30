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
  proximityScore,
  reachabilityScore,
  scoreLead,
  sizeFactor,
  weightedScore,
} from '@/domain/scoring';
import type { Dimensions, Lead, Route } from '@/domain/types';

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

const route: Route = {
  id: 'R',
  name: 'Test',
  points: [
    { lat: 53.0, lng: 8.0 },
    { lat: 53.2, lng: 8.0 },
  ],
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

describe('proximityScore', () => {
  it('ergibt 100 bei 2 Minuten Umweg', () => {
    expect(proximityScore(2)).toBe(100);
  });

  it('zieht 9 Punkte je Minute über 2 ab', () => {
    expect(proximityScore(7.3)).toBeCloseTo(52.3, 10);
  });

  it('fällt nicht unter 0', () => {
    expect(proximityScore(28.7)).toBe(0);
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
  it('lässt die Standardgewichte mit Summe 100 unverändert', () => {
    expect(normalizeWeights(DEFAULT_WEIGHTS)).toEqual({
      fit: 30,
      proximity: 30,
      potential: 25,
      reachability: 15,
    });
  });

  it('normiert auf Summe 100', () => {
    const w = normalizeWeights({ fit: 50, proximity: 50, potential: 0, reachability: 0 });
    expect(w).toEqual({ fit: 50, proximity: 50, potential: 0, reachability: 0 });
    const v = normalizeWeights({ fit: 10, proximity: 10, potential: 10, reachability: 10 });
    expect(v).toEqual({ fit: 25, proximity: 25, potential: 25, reachability: 25 });
  });

  it('gewichtet gleich, wenn alle Gewichte null sind', () => {
    expect(normalizeWeights({ fit: 0, proximity: 0, potential: 0, reachability: 0 })).toEqual({
      fit: 25,
      proximity: 25,
      potential: 25,
      reachability: 25,
    });
  });

  it('begrenzt Rohwerte auf 0 bis 50', () => {
    const w = normalizeWeights({ fit: 80, proximity: -10, potential: 50, reachability: 0 });
    expect(w).toEqual({ fit: 50, proximity: 0, potential: 50, reachability: 0 });
  });
});

describe('weightedScore', () => {
  it('rundet die gewichtete Summe', () => {
    const dims: Dimensions = { fit: 95, proximity: 100, potential: 50, reachability: 67 };
    // 95*0,30 + 100*0,30 + 50*0,25 + 67*0,15 = 81,05
    expect(weightedScore(dims, DEFAULT_WEIGHTS)).toBe(81);
  });

  it('ergibt bei Gleichgewichtung den Mittelwert', () => {
    const dims: Dimensions = { fit: 80, proximity: 60, potential: 40, reachability: 20 };
    expect(weightedScore(dims, { fit: 0, proximity: 0, potential: 0, reachability: 0 })).toBe(50);
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
    const at = (v: number): Dimensions => ({ fit: v, proximity: v, potential: v, reachability: v });
    expect(bandFor(weightedScore(at(77), DEFAULT_WEIGHTS))).toBe('B');
    expect(bandFor(weightedScore(at(78), DEFAULT_WEIGHTS))).toBe('A');
    expect(bandFor(weightedScore(at(57), DEFAULT_WEIGHTS))).toBe('C');
    expect(bandFor(weightedScore(at(58), DEFAULT_WEIGHTS))).toBe('B');
  });
});

describe('scoreLead', () => {
  it('bewertet einen Lead auf der Route vollständig', () => {
    const result = scoreLead(baseLead, route, DEFAULT_WEIGHTS, 2);
    expect(result.distanceKm).toBeCloseTo(0, 9);
    expect(result.detourMinutes).toBe(2);
    expect(result.inCorridor).toBe(true);
    expect(result.dimensions.fit).toBe(95);
    expect(result.dimensions.proximity).toBe(100);
    expect(result.dimensions.potential).toBeCloseTo(50, 10);
    expect(result.dimensions.reachability).toBe(67);
    expect(result.score).toBe(81);
    expect(result.band).toBe('A');
  });

  it('markiert Leads außerhalb des Korridors', () => {
    const far = { ...baseLead, lng: 8.2 };
    const result = scoreLead(far, route, DEFAULT_WEIGHTS, 2);
    expect(result.inCorridor).toBe(false);
    expect(result.dimensions.proximity).toBe(0);
  });

  it('berechnet Dimensionen aus dem Umweg', () => {
    expect(computeDimensions(baseLead, 7.3).proximity).toBeCloseTo(52.3, 10);
  });
});
