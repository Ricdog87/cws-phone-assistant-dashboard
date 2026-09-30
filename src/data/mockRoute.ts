import type { Route } from '@/domain/types';

// Beispielroute entlang der A28 und A31, Bremen bis Emden. Stützpunkte angenähert.
export const MOCK_ROUTE: Route = {
  id: 'route-nordwest-demo',
  name: 'Serviceroute Nordwest (Demo)',
  points: [
    { lat: 53.083, lng: 8.813 },
    { lat: 53.06, lng: 8.77 },
    { lat: 53.0507, lng: 8.6313 },
    { lat: 53.045, lng: 8.54 },
    { lat: 53.075, lng: 8.43 },
    { lat: 53.098, lng: 8.33 },
    { lat: 53.115, lng: 8.27 },
    { lat: 53.1435, lng: 8.2146 },
    { lat: 53.155, lng: 8.13 },
    { lat: 53.183, lng: 8.006 },
    { lat: 53.257, lng: 7.927 },
    { lat: 53.221, lng: 7.797 },
    { lat: 53.205, lng: 7.666 },
    { lat: 53.2317, lng: 7.461 },
    { lat: 53.301, lng: 7.44 },
    { lat: 53.3669, lng: 7.206 },
  ],
};
