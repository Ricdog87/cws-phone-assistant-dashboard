import { NORDWEST_STATES } from './nordwestStates';

export const TERRITORY_NAME = 'Vertriebsgebiet Nordwest';

/** Alle Grenzpunkte des Gebiets, etwa zum Einpassen der Karte */
export const TERRITORY_POINTS: [number, number][] = NORDWEST_STATES.flatMap((state) =>
  state.rings.flat(),
);

export { NORDWEST_MASK_HOLES, NORDWEST_STATES } from './nordwestStates';
