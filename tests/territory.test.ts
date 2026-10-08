import { describe, expect, it } from 'vitest';
import { withDemoOwnership } from '@/data/demoOwnership';
import { DEMO_HUNTERS } from '@/data/hunters';
import { MOCK_LEADS } from '@/data/mockLeads';
import { MOCK_LEADS_NORDWEST } from '@/data/mockLeadsNordwest';
import { NORDWEST_MASK_HOLES, NORDWEST_STATES, TERRITORY_POINTS, stateAt } from '@/data/territory';
import { pointInRing, type Ring } from '@/domain/geo';

function inTerritory(lat: number | null, lng: number | null): boolean {
  return lat !== null && lng !== null && stateAt(lat, lng) !== null;
}

const ALL_LEADS = [...MOCK_LEADS, ...MOCK_LEADS_NORDWEST];

describe('Vertriebsgebiet Nordwest', () => {
  it('umfasst genau die fünf Bundesländer', () => {
    expect(NORDWEST_STATES.map((state) => state.name)).toEqual([
      'Schleswig-Holstein',
      'Hamburg',
      'Bremen',
      'Niedersachsen',
      'Nordrhein-Westfalen',
    ]);
    expect(TERRITORY_POINTS.length).toBeGreaterThan(500);
  });

  it('erkennt Orte innerhalb und außerhalb', () => {
    expect(inTerritory(51.2042, 6.6879)).toBe(true); // Neuss
    expect(inTerritory(53.5511, 9.9937)).toBe(true); // Hamburg
    expect(inTerritory(54.3233, 10.1228)).toBe(true); // Kiel
    expect(inTerritory(50.1109, 8.6821)).toBe(false); // Frankfurt am Main
    expect(inTerritory(52.52, 13.405)).toBe(false); // Berlin
  });

  it('spart die Enklave Bremen nicht doppelt aus', () => {
    const bremenCity = (ring: Ring) => pointInRing(53.0793, 8.8017, ring);
    expect(NORDWEST_MASK_HOLES.filter(bremenCity)).toHaveLength(1);
  });

  it('legt alle Demo-Leads ins Gebiet', () => {
    const outside = ALL_LEADS.filter((lead) => !inTerritory(lead.lat, lead.lng));
    expect(outside.map((lead) => `${lead.name}, ${lead.city}`)).toEqual([]);
  });

  it('ordnet NRW-Leads den NRW-Huntern zu und alle anderen der Region Nord', () => {
    const owned = withDemoOwnership(ALL_LEADS, '2026-10-08');
    const regionOf = (owner: string | null | undefined) =>
      DEMO_HUNTERS.find((hunter) => hunter.name === owner)?.regionId;
    for (const lead of owned) {
      const nrw =
        lead.lat !== null &&
        lead.lng !== null &&
        stateAt(lead.lat, lead.lng) === 'Nordrhein-Westfalen';
      expect(regionOf(lead.owner), lead.name).toBe(nrw ? 'nrw' : 'nord');
    }
  });

  it('vergibt Hunter und letzte Aktivität stabil', () => {
    const first = withDemoOwnership(ALL_LEADS, '2026-10-08');
    const second = withDemoOwnership(ALL_LEADS, '2026-10-08');
    expect(second).toEqual(first);
    const withoutActivity = first.filter((lead) => lead.lastActivity === null).length;
    expect(withoutActivity).toBeGreaterThan(0);
    expect(withoutActivity).toBeLessThan(first.length / 2);
  });
});
