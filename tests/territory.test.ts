import { describe, expect, it } from 'vitest';
import { MOCK_LEADS } from '@/data/mockLeads';
import { MOCK_LEADS_NORDWEST } from '@/data/mockLeadsNordwest';
import { NORDWEST_MASK_HOLES, NORDWEST_STATES, TERRITORY_POINTS } from '@/data/territory';
import { DEFAULT_TOUR_ID, SERVICE_TOURS, tourById } from '@/data/tours';
import { buildQueue } from '@/domain/queue';
import { DEFAULT_CORRIDOR_KM, DEFAULT_WEIGHTS, scoreLeads } from '@/domain/scoring';

type Ring = [number, number][];

/** Strahlverfahren, Punkt und Ring als [Breite, Länge] */
function inside(lat: number, lng: number, ring: Ring): boolean {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i] ?? [0, 0];
    const [yj, xj] = ring[j] ?? [0, 0];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) result = !result;
  }
  return result;
}

function inTerritory(lat: number, lng: number): boolean {
  return NORDWEST_STATES.some((state) => state.rings.some((ring) => inside(lat, lng, ring)));
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
    const bremenCity = (ring: Ring) => inside(53.0793, 8.8017, ring);
    expect(NORDWEST_MASK_HOLES.filter(bremenCity)).toHaveLength(1);
  });

  it('legt alle Touren und Leads ins Gebiet', () => {
    for (const tour of SERVICE_TOURS) {
      for (const point of tour.points) expect(inTerritory(point.lat, point.lng)).toBe(true);
    }
    const outside = ALL_LEADS.filter((lead) => !inTerritory(lead.lat, lead.lng));
    expect(outside.map((lead) => `${lead.name}, ${lead.city}`)).toEqual([]);
  });
});

describe('Servicetouren', () => {
  it('hat fünf Touren je Region, Montag bis Freitag', () => {
    for (const region of ['nord', 'nrw'] as const) {
      expect(
        SERVICE_TOURS.filter((tour) => tour.regionId === region).map((tour) => tour.weekday),
      ).toEqual(['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']);
    }
    expect(new Set(SERVICE_TOURS.map((tour) => tour.id)).size).toBe(10);
  });

  it('füllt jede Tour mit Leads im Standardkorridor', () => {
    for (const tour of SERVICE_TOURS) {
      const queue = buildQueue(
        scoreLeads(ALL_LEADS, tour, DEFAULT_WEIGHTS, DEFAULT_CORRIDOR_KM),
        true,
      );
      expect(queue.length, tour.name).toBeGreaterThanOrEqual(12);
    }
  });

  it('startet mit der Tour Weser-Ems und fällt bei unbekannter ID auf sie zurück', () => {
    expect(tourById(DEFAULT_TOUR_ID).name).toBe('Bremen – Oldenburg – Emden');
    expect(tourById('gibt-es-nicht').id).toBe(DEFAULT_TOUR_ID);
  });
});
