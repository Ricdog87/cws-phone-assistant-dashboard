/** Region eines Teams im Vertriebsgebiet Nordwest */
export type TerritoryRegionId = 'nord' | 'nrw';

/** Hunter (Sales Rep) im Außendienst New Business, in Salesforce der Accountinhaber */
export interface Hunter {
  name: string;
  email: string;
  regionId: TerritoryRegionId;
  /** Gebiet in Worten, etwa für Auswahlfelder */
  area: string;
  /** PLZ-Leitzonen (zweistellig), die zum Gebiet gehören */
  postalPrefixes: readonly string[];
}

/**
 * Erfundene Hunter auf der reservierten Domain cws.example, Gebiete nach PLZ-Leitzonen.
 * Nord mit sechs, NRW mit fünf Gebieten; die erste Person je Region ist der Rückfall.
 */
export const DEMO_HUNTERS: readonly Hunter[] = [
  {
    name: 'Jonas Tiedemann',
    email: 'jonas.tiedemann@cws.example',
    regionId: 'nord',
    area: 'Oldenburg und Ostfriesland',
    postalPrefixes: ['26'],
  },
  {
    name: 'Lars Kampmann',
    email: 'lars.kampmann@cws.example',
    regionId: 'nord',
    area: 'Emsland und Osnabrück',
    postalPrefixes: ['48', '49'],
  },
  {
    name: 'Henning Rathjen',
    email: 'henning.rathjen@cws.example',
    regionId: 'nord',
    area: 'Bremen und Elbe-Weser',
    postalPrefixes: ['27', '28'],
  },
  {
    name: 'Malte Hartwig',
    email: 'malte.hartwig@cws.example',
    regionId: 'nord',
    area: 'Hamburg',
    postalPrefixes: ['20', '21', '22'],
  },
  {
    name: 'Birte Carstens',
    email: 'birte.carstens@cws.example',
    regionId: 'nord',
    area: 'Schleswig-Holstein',
    postalPrefixes: ['23', '24', '25'],
  },
  {
    name: 'Florian Wedekind',
    email: 'florian.wedekind@cws.example',
    regionId: 'nord',
    area: 'Hannover, Braunschweig und Südniedersachsen',
    postalPrefixes: ['29', '30', '31', '37', '38'],
  },
  {
    name: 'Kai Overbeck',
    email: 'kai.overbeck@cws.example',
    regionId: 'nrw',
    area: 'Köln, Bonn und Aachen',
    postalPrefixes: ['50', '51', '52', '53'],
  },
  {
    name: 'Sandra Lenzen',
    email: 'sandra.lenzen@cws.example',
    regionId: 'nrw',
    area: 'Düsseldorf und Niederrhein',
    postalPrefixes: ['40', '41', '47'],
  },
  {
    name: 'Dennis Wolters',
    email: 'dennis.wolters@cws.example',
    regionId: 'nrw',
    area: 'Ruhrgebiet',
    postalPrefixes: ['44', '45', '46'],
  },
  {
    name: 'Philipp Strotmann',
    email: 'philipp.strotmann@cws.example',
    regionId: 'nrw',
    area: 'Münsterland und Ostwestfalen',
    postalPrefixes: ['32', '33', '48'],
  },
  {
    name: 'Nadine Hesse',
    email: 'nadine.hesse@cws.example',
    regionId: 'nrw',
    area: 'Bergisches Land und Südwestfalen',
    postalPrefixes: ['42', '57', '58', '59'],
  },
];

/** Hunter zum Accountinhaber. Für importierte Namen ohne Eintrag gibt es keine E-Mail. */
export function hunterByName(name: string | null | undefined): Hunter | undefined {
  if (!name) return undefined;
  const key = name.trim().toLowerCase();
  return DEMO_HUNTERS.find((hunter) => hunter.name.toLowerCase() === key);
}

/**
 * Hunter, in dessen Gebiet die PLZ liegt. Zuerst die Region (Bundesland), dann die
 * PLZ-Leitzone; ohne Treffer der erste Hunter der Region.
 */
export function hunterForArea(
  regionId: TerritoryRegionId,
  postalCode: string,
  hunters: readonly Hunter[] = DEMO_HUNTERS,
): Hunter | undefined {
  const regional = hunters.filter((hunter) => hunter.regionId === regionId);
  const prefix = postalCode.trim().slice(0, 2);
  return regional.find((hunter) => hunter.postalPrefixes.includes(prefix)) ?? regional[0];
}
