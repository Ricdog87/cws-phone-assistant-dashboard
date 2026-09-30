import { describe, expect, it } from 'vitest';
import {
  CONTROL_SEED,
  applyControlSample,
  controlCount,
  createRandom,
  evenPositions,
  seededShuffle,
} from '@/domain/sampling';
import { bandFor } from '@/domain/scoring';
import type { Lead, ScoredLead } from '@/domain/types';

function makeLead(index: number, score: number): ScoredLead {
  const id = `L-${String(index).padStart(3, '0')}`;
  const lead: Lead = {
    id,
    name: `Betrieb ${index}`,
    industry: 'Metallbau',
    street: '',
    postalCode: '',
    city: '',
    lat: 53,
    lng: 8,
    commercialEmployees: 50,
    wearerCount: 50,
    phone: '',
    hasDirectDial: false,
    contactName: null,
    contactRole: null,
    openPositions: 0,
    certification: null,
    siteExpansion: false,
    managementChange: false,
    isCustomer: false,
  };
  return {
    lead,
    distanceKm: 0,
    detourMinutes: 2,
    inCorridor: true,
    dimensions: { fit: 0, proximity: 0, potential: 0, reachability: 0 },
    score,
    band: bandFor(score),
  };
}

// 50 Leads, absteigend sortiert: 20 in Band A (Score 99 bis 80), 30 in B und C (Score 70 bis 41)
const queue: ScoredLead[] = [
  ...Array.from({ length: 20 }, (_, i) => makeLead(i + 1, 99 - i)),
  ...Array.from({ length: 30 }, (_, i) => makeLead(i + 21, 70 - i)),
];

describe('createRandom', () => {
  it('liefert für denselben Seed dieselbe Folge', () => {
    const a = createRandom(42);
    const b = createRandom(42);
    const seqA = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(seqA);
  });

  it('liefert Werte in [0, 1)', () => {
    const r = createRandom(CONTROL_SEED);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('liefert für Seed 1 den festen ersten Wert', () => {
    expect(createRandom(1)()).toBeCloseTo(0.6270739405881613, 12);
  });
});

describe('seededShuffle', () => {
  it('ist reproduzierbar und verändert die Eingabe nicht', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const first = seededShuffle(input, 7);
    expect(seededShuffle(input, 7)).toEqual(first);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...first].sort((x, y) => x - y)).toEqual(input);
  });
});

describe('controlCount', () => {
  it.each([
    [50, 4],
    [25, 2],
    [7, 1],
    [6, 0],
    [0, 0],
  ])('bei %i Leads werden %i gezogen', (n, k) => {
    expect(controlCount(n)).toBe(k);
  });
});

describe('evenPositions', () => {
  it('verteilt gleichmäßig', () => {
    expect(evenPositions(50, 4)).toEqual([6, 18, 31, 43]);
    expect(evenPositions(10, 1)).toEqual([5]);
    expect(evenPositions(10, 0)).toEqual([]);
  });
});

describe('applyControlSample', () => {
  it('zieht 8 Prozent aus Band B und C und streut sie gleichmäßig ein', () => {
    const result = applyControlSample(queue, { enabled: true });
    const control = result.filter((e) => e.isControl);

    expect(result).toHaveLength(50);
    expect(control).toHaveLength(4);
    expect(control.every((e) => e.band === 'B' || e.band === 'C')).toBe(true);
    expect(control.map((e) => e.position)).toEqual([7, 19, 32, 44]);
    expect(new Set(result.map((e) => e.lead.id)).size).toBe(50);
    expect(result.map((e) => e.position)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });

  it('wählt mit festem Seed immer dieselben Leads', () => {
    const ids = applyControlSample(queue, { enabled: true })
      .filter((e) => e.isControl)
      .map((e) => e.lead.id);
    expect(ids).toEqual(EXPECTED_CONTROL_IDS);
  });

  it('hängt nicht von der Reihenfolge der Kandidaten ab', () => {
    const reversedTail = [...queue.slice(0, 20), ...queue.slice(20).reverse()];
    const ids = applyControlSample(reversedTail, { enabled: true })
      .filter((e) => e.isControl)
      .map((e) => e.lead.id)
      .sort();
    expect(ids).toEqual([...EXPECTED_CONTROL_IDS].sort());
  });

  it('behält die Score-Reihenfolge der regulären Leads bei', () => {
    const regular = applyControlSample(queue, { enabled: true }).filter((e) => !e.isControl);
    const scores = regular.map((e) => e.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it('markiert nichts, wenn die Stichprobe ausgeschaltet ist', () => {
    const result = applyControlSample(queue, { enabled: false });
    expect(result.some((e) => e.isControl)).toBe(false);
    expect(result.map((e) => e.lead.id)).toEqual(queue.map((e) => e.lead.id));
  });

  it('markiert nichts ohne Kandidaten aus Band B und C', () => {
    const onlyA = queue.slice(0, 20);
    expect(applyControlSample(onlyA, { enabled: true }).some((e) => e.isControl)).toBe(false);
  });

  it('kommt mit einer leeren Warteschlange zurecht', () => {
    expect(applyControlSample([], { enabled: true })).toEqual([]);
  });
});

// Mit CONTROL_SEED gezogene Stichprobe. Ändert sich dieser Wert, ist die Reproduzierbarkeit gebrochen.
const EXPECTED_CONTROL_IDS = ['L-026', 'L-032', 'L-038', 'L-050'];
