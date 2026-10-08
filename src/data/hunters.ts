/** Region eines Teams im Vertriebsgebiet Nordwest */
export type TerritoryRegionId = 'nord' | 'nrw';

/** Hunter im Außendienst New Business, in Salesforce der Accountinhaber */
export interface Hunter {
  name: string;
  email: string;
  regionId: TerritoryRegionId;
}

/** Erfundene Hunter auf der reservierten Domain cws.example */
export const DEMO_HUNTERS: readonly Hunter[] = [
  { name: 'Jonas Tiedemann', email: 'jonas.tiedemann@cws.example', regionId: 'nord' },
  { name: 'Malte Hartwig', email: 'malte.hartwig@cws.example', regionId: 'nord' },
  { name: 'Kai Overbeck', email: 'kai.overbeck@cws.example', regionId: 'nrw' },
  { name: 'Dennis Wolters', email: 'dennis.wolters@cws.example', regionId: 'nrw' },
];

/** Hunter zum Accountinhaber. Für importierte Namen ohne Eintrag gibt es keine E-Mail. */
export function hunterByName(name: string | null | undefined): Hunter | undefined {
  if (!name) return undefined;
  const key = name.trim().toLowerCase();
  return DEMO_HUNTERS.find((hunter) => hunter.name.toLowerCase() === key);
}
