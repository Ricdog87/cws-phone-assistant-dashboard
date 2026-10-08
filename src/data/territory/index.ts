import { pointInRing } from '@/domain/geo';
import { NORDWEST_STATES } from './nordwestStates';

export const TERRITORY_NAME = 'Vertriebsgebiet Nordwest';

/** Alle Grenzpunkte des Gebiets, etwa zum Einpassen der Karte */
export const TERRITORY_POINTS: [number, number][] = NORDWEST_STATES.flatMap((state) =>
  state.rings.flat(),
);

/** Bundesland des Punkts im Gebiet oder null außerhalb */
export function stateAt(lat: number, lng: number): string | null {
  const state = NORDWEST_STATES.find((item) =>
    item.rings.some((ring) => pointInRing(lat, lng, ring)),
  );
  return state?.name ?? null;
}

export { NORDWEST_MASK_HOLES, NORDWEST_STATES } from './nordwestStates';
