import { describe, expect, it } from 'vitest';
import { withDemoOwnership } from '@/data/demoOwnership';
import { DEMO_HUNTERS, hunterForArea } from '@/data/hunters';
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

  it('ordnet jeden Lead dem Hunter seines Gebiets zu', () => {
    const owned = withDemoOwnership(ALL_LEADS, '2026-10-08');
    for (const lead of owned) {
      const nrw =
        lead.lat !== null &&
        lead.lng !== null &&
        stateAt(lead.lat, lead.lng) === 'Nordrhein-Westfalen';
      const hunter = DEMO_HUNTERS.find((item) => item.name === lead.owner);
      expect(hunter?.regionId, lead.name).toBe(nrw ? 'nrw' : 'nord');
      expect(hunter?.postalPrefixes, lead.name).toContain(lead.postalCode.slice(0, 2));
    }
    // Jeder Hunter hat eine eigene Leadliste
    for (const hunter of DEMO_HUNTERS) {
      expect(owned.filter((lead) => lead.owner === hunter.name).length).toBeGreaterThan(10);
    }
    expect(DEMO_HUNTERS.filter((hunter) => hunter.regionId === 'nord')).toHaveLength(6);
    expect(DEMO_HUNTERS.filter((hunter) => hunter.regionId === 'nrw')).toHaveLength(5);
  });

  it('findet den Hunter über Region und PLZ-Leitzone', () => {
    expect(hunterForArea('nord', '26122')?.name).toBe('Jonas Tiedemann');
    expect(hunterForArea('nord', '20095')?.name).toBe('Malte Hartwig');
    expect(hunterForArea('nord', '24103')?.name).toBe('Birte Carstens');
    expect(hunterForArea('nord', '28195')?.name).toBe('Henning Rathjen');
    expect(hunterForArea('nord', '30159')?.name).toBe('Florian Wedekind');
    // Leitzone 48 liegt in beiden Regionen: Grafschaft Bentheim in Nord, Münster in NRW
    expect(hunterForArea('nrw', '48143')?.name).toBe('Philipp Strotmann');
    expect(hunterForArea('nord', '48529')?.name).toBe('Lars Kampmann');
    expect(hunterForArea('nrw', '50667')?.name).toBe('Kai Overbeck');
    expect(hunterForArea('nrw', '40210')?.name).toBe('Sandra Lenzen');
    expect(hunterForArea('nrw', '44135')?.name).toBe('Dennis Wolters');
    expect(hunterForArea('nrw', '58095')?.name).toBe('Nadine Hesse');
    // Unbekannte Leitzone fällt auf den ersten Hunter der Region
    expect(hunterForArea('nord', '99999')?.name).toBe('Jonas Tiedemann');
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
