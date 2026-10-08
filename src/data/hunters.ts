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

/** Erfundene Hunter auf der reservierten Domain cws.example, Gebiete nach PLZ-Leitzonen */
export const DEMO_HUNTERS: readonly Hunter[] = [
  {
    name: 'Jonas Tiedemann',
    email: 'jonas.tiedemann@cws.example',
    regionId: 'nord',
    area: 'Weser-Ems und Osnabrück',
    postalPrefixes: ['26', '48', '49'],
  },
  {
    name: 'Malte Hartwig',
    email: 'malte.hartwig@cws.example',
    regionId: 'nord',
    area: 'Bremen, Hamburg, Schleswig-Holstein, Hannover',
    postalPrefixes: ['20', '21', '22', '23', '24', '25', '27', '28', '29', '30', '31', '37', '38'],
  },
  {
    name: 'Kai Overbeck',
    email: 'kai.overbeck@cws.example',
    regionId: 'nrw',
    area: 'Rheinland',
    postalPrefixes: ['40', '41', '42', '47', '50', '51', '52', '53'],
  },
  {
    name: 'Dennis Wolters',
    email: 'dennis.wolters@cws.example',
    regionId: 'nrw',
    area: 'Ruhrgebiet und Westfalen',
    postalPrefixes: ['32', '33', '44', '45', '46', '48', '57', '58', '59'],
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
