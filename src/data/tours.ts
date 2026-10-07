import type { Route } from '@/domain/types';
import { MOCK_ROUTE } from './mockRoute';

/** Region eines Teams im Vertriebsgebiet Nordwest */
export type TerritoryRegionId = 'nord' | 'nrw';

export interface ServiceTour extends Route {
  weekday: 'Montag' | 'Dienstag' | 'Mittwoch' | 'Donnerstag' | 'Freitag';
  regionId: TerritoryRegionId;
}

/**
 * Beispieltouren entlang der Autobahnen im Vertriebsgebiet Nordwest.
 * Stützpunkte angenähert, Orte real, Touren erfunden. Für echte Touren siehe docs/architektur.md.
 */
export const SERVICE_TOURS: readonly ServiceTour[] = [
  {
    id: 'tour-hamburg-kiel',
    name: 'Hamburg – Neumünster – Kiel',
    weekday: 'Montag',
    regionId: 'nord',
    points: [
      { lat: 53.5511, lng: 9.9937 },
      { lat: 53.7064, lng: 9.9997 },
      { lat: 53.919, lng: 9.884 },
      { lat: 54.0716, lng: 9.99 },
      { lat: 54.176, lng: 10.019 },
      { lat: 54.3233, lng: 10.1228 },
    ],
  },
  {
    ...MOCK_ROUTE,
    id: 'tour-weser-ems',
    name: 'Bremen – Oldenburg – Emden',
    weekday: 'Dienstag',
    regionId: 'nord',
  },
  {
    id: 'tour-bremen-cuxhaven',
    name: 'Bremen – Bremerhaven – Cuxhaven',
    weekday: 'Mittwoch',
    regionId: 'nord',
    points: [
      { lat: 53.0793, lng: 8.8017 },
      { lat: 53.227, lng: 8.79 },
      { lat: 53.38, lng: 8.67 },
      { lat: 53.5396, lng: 8.5809 },
      { lat: 53.7, lng: 8.64 },
      { lat: 53.8615, lng: 8.6944 },
    ],
  },
  {
    id: 'tour-hannover-wolfsburg',
    name: 'Hannover – Braunschweig – Wolfsburg',
    weekday: 'Donnerstag',
    regionId: 'nord',
    points: [
      { lat: 52.3759, lng: 9.732 },
      { lat: 52.372, lng: 9.977 },
      { lat: 52.319, lng: 10.234 },
      { lat: 52.2689, lng: 10.5268 },
      { lat: 52.4227, lng: 10.7865 },
    ],
  },
  {
    id: 'tour-osnabrueck-emsland',
    name: 'Osnabrück – Fürstenau – Lingen – Nordhorn',
    weekday: 'Freitag',
    regionId: 'nord',
    points: [
      { lat: 52.2799, lng: 8.0472 },
      { lat: 52.408, lng: 7.973 },
      { lat: 52.517, lng: 7.677 },
      { lat: 52.487, lng: 7.543 },
      { lat: 52.5233, lng: 7.3172 },
      { lat: 52.4319, lng: 7.0678 },
    ],
  },
  {
    id: 'tour-ruhrgebiet',
    name: 'Duisburg – Essen – Dortmund',
    weekday: 'Montag',
    regionId: 'nrw',
    points: [
      { lat: 51.4344, lng: 6.7623 },
      { lat: 51.4275, lng: 6.8825 },
      { lat: 51.4556, lng: 7.0116 },
      { lat: 51.4818, lng: 7.2162 },
      { lat: 51.5136, lng: 7.4653 },
    ],
  },
  {
    id: 'tour-rheinschiene',
    name: 'Mönchengladbach – Neuss – Köln – Bonn',
    weekday: 'Dienstag',
    regionId: 'nrw',
    points: [
      { lat: 51.1805, lng: 6.4428 },
      { lat: 51.2042, lng: 6.6879 },
      { lat: 51.2277, lng: 6.7735 },
      { lat: 51.0459, lng: 6.9853 },
      { lat: 50.9375, lng: 6.9603 },
      { lat: 50.7374, lng: 7.0982 },
    ],
  },
  {
    id: 'tour-ostwestfalen',
    name: 'Münster – Bielefeld – Herford',
    weekday: 'Mittwoch',
    regionId: 'nrw',
    points: [
      { lat: 51.9607, lng: 7.6261 },
      { lat: 51.93, lng: 8.0 },
      { lat: 51.9063, lng: 8.3784 },
      { lat: 52.0302, lng: 8.5325 },
      { lat: 52.1146, lng: 8.6734 },
    ],
  },
  {
    id: 'tour-koeln-aachen',
    name: 'Köln – Düren – Aachen',
    weekday: 'Donnerstag',
    regionId: 'nrw',
    points: [
      { lat: 50.9375, lng: 6.9603 },
      { lat: 50.912, lng: 6.81 },
      { lat: 50.8044, lng: 6.4927 },
      { lat: 50.818, lng: 6.272 },
      { lat: 50.7753, lng: 6.0839 },
    ],
  },
  {
    id: 'tour-bergisches-land',
    name: 'Dortmund – Hagen – Wuppertal – Solingen',
    weekday: 'Freitag',
    regionId: 'nrw',
    points: [
      { lat: 51.5136, lng: 7.4653 },
      { lat: 51.3671, lng: 7.4633 },
      { lat: 51.2562, lng: 7.1508 },
      { lat: 51.1652, lng: 7.0671 },
    ],
  },
];

export const DEFAULT_TOUR_ID = 'tour-weser-ems';

export function tourById(id: string): ServiceTour {
  return (
    SERVICE_TOURS.find((tour) => tour.id === id) ??
    SERVICE_TOURS.find((tour) => tour.id === DEFAULT_TOUR_ID) ??
    (SERVICE_TOURS[0] as ServiceTour)
  );
}
